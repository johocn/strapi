"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const USER_UID = "plugin::zhao-sso.sso-user";
function sanitize(user) {
    if (!user)
        return null;
    const { password_hash, ...safe } = user;
    void password_hash;
    return safe;
}
/** PG 唯一约束冲突（主键重复）判断：用于 sso_users 序列失步自愈 */
function isPkeyViolation(e) {
    const msg = String((e === null || e === void 0 ? void 0 : e.message) || (e === null || e === void 0 ? void 0 : e.detail) || "");
    return msg.includes("sso_users_pkey") || msg.includes("duplicate key") || (e === null || e === void 0 ? void 0 : e.code) === "23505";
}
exports.default = ({ strapi }) => {
    function throwErr(code, status, message) {
        const e = new Error(message);
        e.code = code;
        e.status = status;
        throw e;
    }
    return {
        /** 幂等同步 sso_users 主键序列：仅当 nextval 将撞上已有 id 时 setval(max(id))（备份恢复/显式ID合并后的自愈） */
        async syncSequence() {
            var _a, _b, _c, _d;
            try {
                const knex = strapi.db.connection;
                const seqRes = await knex.raw(`SELECT last_value, is_called FROM sso_users_id_seq`);
                const maxRes = await knex.raw(`SELECT COALESCE(MAX(id), 0) AS max_id FROM sso_users`);
                const seq = Array.isArray(seqRes) ? seqRes[0] : (_a = seqRes.rows) === null || _a === void 0 ? void 0 : _a[0];
                const maxRow = Array.isArray(maxRes) ? maxRes[0] : (_b = maxRes.rows) === null || _b === void 0 ? void 0 : _b[0];
                const lastValue = Number((_c = seq === null || seq === void 0 ? void 0 : seq.last_value) !== null && _c !== void 0 ? _c : 0);
                const isCalled = !!(seq === null || seq === void 0 ? void 0 : seq.is_called);
                const maxId = Number((_d = maxRow === null || maxRow === void 0 ? void 0 : maxRow.max_id) !== null && _d !== void 0 ? _d : 0);
                const next = isCalled ? lastValue + 1 : lastValue;
                if (next <= maxId) {
                    await knex.raw(`SELECT setval('sso_users_id_seq'::regclass, ?)`, [maxId]);
                    strapi.log.info(`[zhao-sso] sso_users 序列自愈: next=${next} max=${maxId} -> next=${maxId + 1}`);
                }
            }
            catch (e) {
                strapi.log.warn(`[zhao-sso] sso_users 序列同步失败: ${e === null || e === void 0 ? void 0 : e.message}`);
            }
        },
        /** 创建 sso_user：捕获主键冲突（序列失步）→ 同步序列 → 重试一次 */
        async createSsoUserWithSeqGuard(data) {
            try {
                return await strapi.db.query(USER_UID).create({ data });
            }
            catch (e) {
                if (isPkeyViolation(e)) {
                    strapi.log.warn(`[zhao-sso] sso_users 主键冲突(序列失步)，同步后重试: ${e === null || e === void 0 ? void 0 : e.message}`);
                    await this.syncSequence();
                    return await strapi.db.query(USER_UID).create({ data });
                }
                throw e;
            }
        },
        async createUser(data) {
            if (!data.username && !data.mobile && !data.email) {
                throwErr("SSO_USER_001", 400, "username/mobile/email at least one required");
            }
            const password_hash = data.password ? await bcryptjs_1.default.hash(data.password, 12) : null;
            const user = await this.createSsoUserWithSeqGuard({
                uuid: (0, uuid_1.v4)(),
                username: data.username || null,
                mobile: data.mobile || null,
                email: data.email || null,
                password_hash,
                status: "active",
                register_channel: data.register_channel || "sso_local",
                utm_source: data.utm_source || null,
                utm_medium: data.utm_medium || null,
                utm_campaign: data.utm_campaign || null,
                invite_code_used: data.invite_code_used || null,
                login_count: 0,
            });
            return user;
        },
        /** 确保 C 端 up_user 与 sso_user 同 id 对齐存在（隔离：写 up_users 归属 zhao-auth 中间层，zhao-sso 不直写他域表） */
        async ensureUpUser(ssoId, info) {
            var _a, _b, _c;
            try {
                const auth = (_c = (_b = (_a = strapi.plugin) === null || _a === void 0 ? void 0 : _a.call(strapi, "zhao-auth")) === null || _b === void 0 ? void 0 : _b.service) === null || _c === void 0 ? void 0 : _c.call(_b, "auth");
                const r = (auth === null || auth === void 0 ? void 0 : auth.ensureUserById) ? await auth.ensureUserById(ssoId, info) : null;
                if (!r) {
                    strapi.log.warn(`[zhao-sso] zhao-auth.ensureUserById 未就绪，跳过 up_users 对齐 sso=${ssoId}`);
                }
                return r;
            }
            catch (e) {
                strapi.log.warn(`[zhao-sso] up_users 对齐失败 sso=${ssoId}: ${(e === null || e === void 0 ? void 0 : e.message) || e}`);
                return null;
            }
        },
        async findByIdentifier(identifier) {
            return strapi.db.query(USER_UID).findOne({
                where: {
                    $or: [
                        { email: identifier.toLowerCase() },
                        { username: identifier },
                        { mobile: identifier },
                    ],
                },
            });
        },
        async findByUuid(uuid) {
            const user = await strapi.db.query(USER_UID).findOne({ where: { uuid } });
            return sanitize(user);
        },
        async verifyPassword(user, password) {
            if (!user.password_hash) {
                const raw = await strapi.db.query(USER_UID).findOne({ where: { id: user.id }, select: ["password_hash"] });
                if (!(raw === null || raw === void 0 ? void 0 : raw.password_hash))
                    return false;
                return bcryptjs_1.default.compare(password, raw.password_hash);
            }
            return bcryptjs_1.default.compare(password, user.password_hash);
        },
        async updateLoginInfo(userId, channelCode) {
            const current = await strapi.db.query(USER_UID).findOne({ where: { id: userId } });
            const updateData = {
                last_login_at: new Date(),
                login_count: ((current === null || current === void 0 ? void 0 : current.login_count) || 0) + 1,
            };
            if (channelCode) {
                updateData.last_login_channel = channelCode;
            }
            return strapi.db.query(USER_UID).update({
                where: { id: userId },
                data: updateData,
            });
        },
        async changePassword(userId, newPassword) {
            const password_hash = await bcryptjs_1.default.hash(newPassword, 12);
            return strapi.db.query(USER_UID).update({
                where: { id: userId },
                data: { password_hash, password_changed_at: new Date() },
            });
        },
        async isBlocked(user) {
            return user.status === "blocked";
        },
        async findById(id) {
            const user = await strapi.db.query(USER_UID).findOne({ where: { id } });
            return sanitize(user);
        },
        async bindContact(userId, type, identifier, password) {
            const updateData = {};
            if (type === "mobile")
                updateData.mobile = identifier;
            if (type === "email")
                updateData.email = identifier;
            if (type === "username")
                updateData.username = identifier;
            if (password)
                updateData.password_hash = await bcryptjs_1.default.hash(password, 12);
            return strapi.db.query(USER_UID).update({ where: { id: userId }, data: updateData });
        },
        async bindThirdParty(userId, providerData) {
            return strapi.db.query("plugin::zhao-sso.sso-third-party-binding").create({
                data: {
                    user: { id: userId },
                    provider: providerData.provider,
                    provider_user_id: providerData.provider_user_id,
                    provider_nickname: providerData.nickname || null,
                    provider_avatar: providerData.avatar || null,
                    provider_data: providerData.raw || null,
                    bound_at: new Date(),
                },
            });
        },
        async unbindThirdParty(userId, provider) {
            return strapi.db.query("plugin::zhao-sso.sso-third-party-binding").delete({
                where: { user: { id: userId }, provider },
            });
        },
        async count(where) {
            return strapi.db.query(USER_UID).count({ where });
        },
        async findMany(params) {
            const users = await strapi.db.query(USER_UID).findMany({
                where: params.where || {},
                orderBy: params.orderBy || { createdAt: "desc" },
                limit: params.limit,
                offset: params.offset,
            });
            return users.map(sanitize);
        },
        async findOneWithBindings(id) {
            const user = await strapi.db.query(USER_UID).findOne({
                where: { id },
                populate: { third_party_bindings: true },
            });
            return sanitize(user);
        },
        async updateAdmin(id, body) {
            const allowedFields = ["status", "nickname", "username"];
            const data = {};
            for (const field of allowedFields) {
                if (body[field] !== undefined)
                    data[field] = body[field];
            }
            const user = await strapi.db.query(USER_UID).update({ where: { id }, data });
            return sanitize(user);
        },
        /** 自助修改本人昵称（C 端个人中心用，白名单仅昵称） */
        async updateNickname(userId, nickname) {
            const name = String(nickname || "").trim().substring(0, 50);
            if (!name)
                throwErr("SSO_NICKNAME_001", 400, "昵称不能为空");
            await strapi.db.query(USER_UID).update({ where: { id: userId }, data: { nickname: name } });
            return this.findById(userId);
        },
    };
};
//# sourceMappingURL=sso-user.js.map