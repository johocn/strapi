"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidatePermissionCache = invalidatePermissionCache;
const permissions_1 = require("../permissions");
const module_visibility_1 = require("../constants/module-visibility");
const PERMISSION_UID = "plugin::zhao-auth.permission";
const USER_UID = "plugin::users-permissions.user";
// getMyPermissions 缓存（卡点 E 修复）
const PERMISSION_CACHE_TTL = 60000; // 60 秒
const permissionCache = new Map();
function invalidatePermissionCache(userId, tenantDocumentId) {
    if (userId && tenantDocumentId) {
        permissionCache.delete(`${userId}|${tenantDocumentId}`);
    }
    else if (userId) {
        for (const key of [...permissionCache.keys()]) {
            if (key.startsWith(`${userId}|`))
                permissionCache.delete(key);
        }
    }
    else if (tenantDocumentId) {
        for (const key of [...permissionCache.keys()]) {
            if (key.endsWith(`|${tenantDocumentId}`))
                permissionCache.delete(key);
        }
    }
    else {
        permissionCache.clear();
    }
}
function normalizeRoleName(name) {
    return String(name || "").trim().toLowerCase().replace(/\s+/g, "-");
}
function findNode(key, tree) {
    for (const [k, node] of Object.entries(tree)) {
        if (k === key)
            return node;
        if (node?.children) {
            const found = findNode(key, node.children);
            if (found)
                return found;
        }
    }
    return null;
}
function expandPermissionKeys(keys) {
    const result = new Set();
    for (const key of keys) {
        result.add(key);
        const found = findNode(key, permissions_1.PERMISSION_TREE);
        // 仅展开非 menu 类型节点的子节点
        // menu 节点的子按钮权限应在 DEFAULT_ROLE_PERMISSIONS 中显式列出
        // 否则显式排除的权限（如 role.create/tenant.delete）会通过 menu 展开间接泄漏
        if (found?.children && found.type !== "menu") {
            (0, permissions_1.flattenPermissions)(found.children).forEach((k) => result.add(k));
        }
    }
    return Array.from(result);
}
exports.default = ({ strapi }) => ({
    /**
     * 获取权限树定义
     */
    getPermissionTree() {
        return permissions_1.PERMISSION_TREE;
    },
    /**
     * 角色列表（分页）
     */
    async listRoles(page = 1, pageSize = 20, filters = {}) {
        const where = {};
        if (filters.role)
            where.role = { $contains: filters.role };
        const records = await strapi.db.query(PERMISSION_UID).findMany({
            where,
            orderBy: { id: "asc" },
            limit: pageSize,
            offset: (page - 1) * pageSize,
        });
        const total = await strapi.db.query(PERMISSION_UID).count({ where });
        const list = records.map((r) => ({
            id: r.id,
            documentId: r.documentId,
            name: r.role,
            role: r.role,
            displayName: r.displayName || r.role,
            description: r.description || "",
            isSystem: !!r.isSystem,
            permissions: r.permissions || [],
            userCount: 0,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
        }));
        return {
            list,
            pagination: {
                page,
                pageSize,
                total,
                pageCount: Math.ceil(total / pageSize),
            },
        };
    },
    /**
     * 获取所有角色（不分页，用于下拉）
     */
    async getAllRoles() {
        const records = await strapi.db.query(PERMISSION_UID).findMany({
            orderBy: { id: "asc" },
        });
        return records.map((r) => ({
            name: r.role,
            role: r.role,
            displayName: r.displayName || r.role,
            isSystem: !!r.isSystem,
        }));
    },
    /**
     * 获取单个角色
     */
    async getRole(roleName) {
        const record = await strapi.db.query(PERMISSION_UID).findOne({
            where: { role: roleName },
        });
        if (!record)
            return null;
        return {
            id: record.id,
            documentId: record.documentId,
            name: record.role,
            role: record.role,
            displayName: record.displayName || record.role,
            description: record.description || "",
            isSystem: !!record.isSystem,
            permissions: record.permissions || [],
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
        };
    },
    /**
     * 创建角色
     */
    async createRole(data, operatorId, operatorLevel) {
        const role = normalizeRoleName(data.role);
        if (!role) {
            const e = new Error("角色名不能为空");
            e.status = 400;
            throw e;
        }
        const targetLevel = data.level ?? 20;
        if (operatorLevel < 100 && targetLevel >= operatorLevel) {
            const e = new Error("不能创建同级或更高层级角色");
            e.code = "ROLE_003";
            e.status = 403;
            throw e;
        }
        const existing = await strapi.db.query(PERMISSION_UID).findOne({
            where: { role },
        });
        if (existing) {
            const e = new Error(`角色 ${role} 已存在`);
            e.status = 409;
            throw e;
        }
        // ===== 新增：permissions 白名单校验（卡点 H）=====
        // admin 跳过校验（admin 拥有全部权限）；operatorLevel < 100 即非 admin
        if (operatorLevel < 100) {
            const operator = await strapi.db.query(USER_UID).findOne({ where: { id: operatorId } });
            const operatorRoles = Array.isArray(operator?.zhaoRoles) ? operator.zhaoRoles : [];
            // 双重保险：operatorLevel < 100 且 roles 含 admin 也跳过（理论上不会发生）
            if (!operatorRoles.includes("admin")) {
                // 获取操作者的有效权限集合
                const operatorPermsResult = await this.getMyPermissions(operatorId);
                const operatorPerms = new Set(operatorPermsResult.permissions);
                // 校验待创建角色的 permissions 是否是操作者权限的子集
                const requestedPerms = Array.isArray(data.permissions) ? data.permissions : [];
                const unauthorizedPerms = requestedPerms.filter((p) => !operatorPerms.has(p));
                if (unauthorizedPerms.length > 0) {
                    const e = new Error(`不能创建包含超出自身权限的角色，未授权权限：${unauthorizedPerms.join(", ")}`);
                    e.code = "PERM_010";
                    e.status = 403;
                    throw e;
                }
            }
        }
        // ===== 白名单校验结束 =====
        const created = await strapi.documents(PERMISSION_UID).create({
            data: {
                role,
                displayName: data.displayName || role,
                description: data.description || "",
                permissions: data.permissions || [],
                isSystem: !!data.isSystem,
                level: targetLevel,
            },
        });
        return {
            id: created.id,
            documentId: created.documentId,
            name: created.role,
            role: created.role,
            displayName: created.displayName,
            description: created.description || "",
            isSystem: !!created.isSystem,
            permissions: created.permissions || [],
            level: created.level ?? targetLevel,
        };
    },
    /**
     * 更新角色
     */
    async updateRole(roleName, data) {
        const existing = await strapi.db.query(PERMISSION_UID).findOne({
            where: { role: roleName },
        });
        if (!existing) {
            const e = new Error(`角色 ${roleName} 不存在`);
            e.status = 404;
            throw e;
        }
        const updateData = {};
        if (data.displayName !== undefined)
            updateData.displayName = data.displayName;
        if (data.description !== undefined)
            updateData.description = data.description;
        if (data.permissions !== undefined)
            updateData.permissions = data.permissions;
        const updated = await strapi.documents(PERMISSION_UID).update({
            documentId: existing.documentId,
            data: updateData,
        });
        return {
            id: updated.id,
            documentId: updated.documentId,
            name: updated.role,
            role: updated.role,
            displayName: updated.displayName,
            description: updated.description || "",
            isSystem: !!updated.isSystem,
            permissions: updated.permissions || [],
        };
    },
    /**
     * 删除角色（系统角色不允许删除）
     */
    async deleteRole(roleName) {
        const existing = await strapi.db.query(PERMISSION_UID).findOne({
            where: { role: roleName },
        });
        if (!existing) {
            const e = new Error(`角色 ${roleName} 不存在`);
            e.status = 404;
            throw e;
        }
        if (existing.isSystem) {
            const e = new Error("系统角色不允许删除");
            e.status = 400;
            throw e;
        }
        // 注：角色使用独立的 zhaoRoles JSON 字段存储，此处简化不做关联检查
        // （角色名字符串存储，不做强制 FK 约束，允许灵活操作）
        await strapi.documents(PERMISSION_UID).delete({ documentId: existing.documentId });
        return { success: true, role: roleName };
    },
    /**
     * 获取某角色权限
     */
    async getRolePermissions(role) {
        const record = await strapi.db.query(PERMISSION_UID).findOne({
            where: { role },
        });
        if (!record) {
            const defaults = permissions_1.DEFAULT_ROLE_PERMISSIONS[role];
            return { role, permissions: defaults || [] };
        }
        return { role, permissions: record.permissions || [] };
    },
    /**
     * 更新某角色权限
     */
    async updateRolePermissions(role, permissionKeys) {
        const existing = await strapi.db.query(PERMISSION_UID).findOne({
            where: { role },
        });
        if (existing) {
            const updated = await strapi.documents(PERMISSION_UID).update({
                documentId: existing.documentId,
                data: { permissions: permissionKeys },
            });
            return { role, permissions: updated.permissions };
        }
        const created = await strapi.documents(PERMISSION_UID).create({
            data: {
                role,
                displayName: permissions_1.ROLE_LABELS[role] || role,
                description: "",
                permissions: permissionKeys,
                isSystem: Object.values(permissions_1.ROLES).includes(role),
            },
        });
        return { role, permissions: created.permissions };
    },
    /**
     * 获取当前用户的所有权限
     */
    async getMyPermissions(userId, tenantDocumentId) {
        // 缓存检查
        const cacheKey = `${userId}|${tenantDocumentId || "global"}`;
        const cached = permissionCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < PERMISSION_CACHE_TTL) {
            return { permissions: cached.data };
        }
        const user = await strapi.db.query(USER_UID).findOne({
            where: { id: userId },
            select: ["id", "zhaoRoles"],
            populate: ["role"],
        });
        if (!user)
            return { permissions: [] };
        // 优先从 zhaoRoles JSON 数组读取角色名
        let userRoles = [];
        if (Array.isArray(user.zhaoRoles) && user.zhaoRoles.length > 0) {
            userRoles = user.zhaoRoles
                .map((r) => (typeof r === "string" ? r : String(r)))
                .filter((r) => r && r.trim());
        }
        else if (user.role) {
            // 回退：从 Strapi 内置 role 表读取 type 字段
            const roleObj = user.role;
            if (Array.isArray(roleObj)) {
                userRoles = roleObj.map((r) => r?.type).filter((type) => type && type.trim());
            }
            else if (roleObj.type) {
                userRoles = [roleObj.type];
            }
            else if (roleObj.name) {
                userRoles = [roleObj.name];
            }
        }
        if (userRoles.length === 0)
            return { permissions: [] };
        // admin 角色全权限
        if (userRoles.includes("admin")) {
            const allPerms = (0, permissions_1.flattenPermissions)(permissions_1.PERMISSION_TREE);
            permissionCache.set(cacheKey, { data: allPerms, timestamp: Date.now() });
            return { permissions: allPerms };
        }
        // 根据每个角色在 zhao-auth.permission 表中查找权限 key
        const allExpanded = new Set();
        for (const roleName of userRoles) {
            try {
                const record = await strapi.db.query(PERMISSION_UID).findOne({
                    where: { role: roleName },
                });
                if (record?.permissions && Array.isArray(record.permissions)) {
                    expandPermissionKeys(record.permissions).forEach((k) => allExpanded.add(k));
                }
                else {
                    // 数据库中没有该角色，使用默认权限映射
                    const defaults = permissions_1.DEFAULT_ROLE_PERMISSIONS[roleName] || [];
                    expandPermissionKeys(defaults).forEach((k) => allExpanded.add(k));
                }
            }
            catch {
                // 单个角色查询失败不影响其他角色
            }
        }
        // channel-admin 专属：动态叠加 moduleVisibility 开启模块的 manager 权限
        // 在现有 for 循环之后执行（admin 显式授予的角色权限已在 allExpanded 中，不受 moduleVisibility 约束）
        if (userRoles.includes(permissions_1.ROLES.CHANNEL_ADMIN)) {
            const moduleVisibility = await this.resolveModuleVisibility(tenantDocumentId);
            for (const [moduleKey, roles] of Object.entries(moduleVisibility)) {
                if (roles.includes(permissions_1.ROLES.CHANNEL_ADMIN)) {
                    const managerRole = permissions_1.MODULE_MANAGER_MAP[moduleKey];
                    if (managerRole) {
                        try {
                            const record = await strapi.db.query(PERMISSION_UID).findOne({
                                where: { role: managerRole },
                            });
                            const managerPerms = record?.permissions ||
                                permissions_1.DEFAULT_ROLE_PERMISSIONS[managerRole] ||
                                [];
                            expandPermissionKeys(managerPerms).forEach((k) => allExpanded.add(k));
                        }
                        catch {
                            const defaults = permissions_1.DEFAULT_ROLE_PERMISSIONS[managerRole] || [];
                            expandPermissionKeys(defaults).forEach((k) => allExpanded.add(k));
                        }
                    }
                }
            }
        }
        const result = Array.from(allExpanded);
        permissionCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return { permissions: result };
    },
    /**
     * 解析合并后的 moduleVisibility（全局默认 ∩ 租户覆盖，交集收窄）
     */
    async resolveModuleVisibility(tenantDocumentId) {
        // 1. 全局默认（admin 配置）
        let globalVisibility = {};
        try {
            const globalConfig = await strapi
                .plugin("zhao-common")
                .service("global-config")
                .getGlobalConfig();
            globalVisibility = globalConfig?.moduleVisibility ?? {};
        }
        catch {
            // global-config 服务不可用时 fallback 到 DEFAULT_MODULE_VISIBILITY
        }
        // 2. 租户覆盖（channel-admin 配置，如有）
        let tenantVisibility = {};
        if (tenantDocumentId) {
            try {
                const siteConfig = await strapi
                    .plugin("zhao-common")
                    .service("site-config")
                    .getConfig(tenantDocumentId);
                tenantVisibility = siteConfig?.moduleVisibility ?? {};
            }
            catch {
                // site-config 服务不可用时用空对象
            }
        }
        // 3. 交集收窄合并：channel-admin 只能从全局已授权角色中移除，不能新增
        const merged = {};
        for (const moduleKey of module_visibility_1.VISIBILITY_MODULES) {
            const globalRoles = globalVisibility[moduleKey] ?? module_visibility_1.DEFAULT_MODULE_VISIBILITY[moduleKey] ?? [];
            const tenantRoles = tenantVisibility[moduleKey];
            // 租户未配置此模块 → 用全局
            // 租户配置了此模块 → 取交集（收窄）
            merged[moduleKey] = tenantRoles
                ? globalRoles.filter((r) => tenantRoles.includes(r))
                : globalRoles;
        }
        return merged;
    },
    /**
     * 失效权限缓存（代理方法，供外部通过 strapi.plugin().service() 调用）
     */
    invalidateCache(userId, tenantDocumentId) {
        invalidatePermissionCache(userId, tenantDocumentId);
    },
    /**
     * 初始化并同步默认角色权限（每次启动时调用）
     * 系统角色的权限会与代码配置保持同步
     */
    async initDefaultRoles() {
        const results = [];
        for (const [role, defaultPerms] of Object.entries(permissions_1.DEFAULT_ROLE_PERMISSIONS)) {
            const existing = await strapi.db.query(PERMISSION_UID).findOne({
                where: { role },
            });
            if (!existing) {
                // 创建新角色
                await strapi.documents(PERMISSION_UID).create({
                    data: {
                        role,
                        displayName: permissions_1.ROLE_LABELS[role] || role,
                        description: "",
                        permissions: defaultPerms,
                        isSystem: Object.values(permissions_1.ROLES).includes(role),
                    },
                });
                results.push(`Created role: ${role}`);
            }
            else {
                // 系统角色：每次启动同步权限配置
                const isSystemRole = Object.values(permissions_1.ROLES).includes(role);
                if (isSystemRole) {
                    await strapi.documents(PERMISSION_UID).update({
                        documentId: existing.documentId,
                        data: {
                            displayName: permissions_1.ROLE_LABELS[role] || role,
                            description: existing.description || "",
                            permissions: defaultPerms,
                            isSystem: true,
                        },
                    });
                    results.push(`Synced permissions for system role: ${role}`);
                }
                else {
                    // 非系统角色：只补全字段，不覆盖权限
                    if (!existing.displayName) {
                        await strapi.documents(PERMISSION_UID).update({
                            documentId: existing.documentId,
                            data: {
                                displayName: permissions_1.ROLE_LABELS[role] || role,
                                description: "",
                                isSystem: false,
                            },
                        });
                        results.push(`Updated role fields for: ${role}`);
                    }
                    else {
                        results.push(`Role ${role} already exists, skipped (non-system)`);
                    }
                }
            }
        }
        return results;
    },
});
