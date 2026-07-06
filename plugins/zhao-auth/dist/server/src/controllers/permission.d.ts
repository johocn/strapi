import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * GET /permissions/tree
     */
    getTree(ctx: any): Promise<void>;
    /**
     * GET /roles — 角色列表
     */
    listRoles(ctx: any): Promise<void>;
    /**
     * GET /roles/all — 全部角色（下拉用）
     */
    getAllRoles(ctx: any): Promise<void>;
    /**
     * GET /roles/:role — 获取单个角色
     */
    getRole(ctx: any): Promise<void>;
    /**
     * POST /roles — 创建角色
     */
    createRole(ctx: any): Promise<void>;
    /**
     * PUT /roles/:role — 更新角色
     */
    updateRole(ctx: any): Promise<void>;
    /**
     * DELETE /roles/:role — 删除角色
     */
    deleteRole(ctx: any): Promise<void>;
    /**
     * GET /permissions/role/:role
     */
    getRolePermissions(ctx: any): Promise<void>;
    /**
     * PUT /permissions/role/:role
     */
    updateRolePermissions(ctx: any): Promise<void>;
    /**
     * POST /permissions/init — 初始化默认角色
     */
    initRoles(ctx: any): Promise<void>;
    /**
     * GET /my/permissions — 获取当前用户权限
     */
    getMyPermissions(ctx: any): Promise<void>;
    /**
     * GET /my/channel-scope
     */
    getMyChannelScope(ctx: any): Promise<void>;
};
export default _default;
