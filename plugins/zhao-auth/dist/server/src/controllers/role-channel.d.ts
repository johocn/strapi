import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * GET /admin/role-channels — 列表
     */
    list(ctx: any): Promise<void>;
    /**
     * POST /admin/role-channels — 授权角色渠道（单个）
     */
    grant(ctx: any): Promise<void>;
    /**
     * POST /admin/role-channels/batch — 批量授权
     */
    batchGrant(ctx: any): Promise<void>;
    /**
     * DELETE /admin/role-channels/:id — 撤销授权
     */
    revoke(ctx: any): Promise<void>;
    /**
     * DELETE /admin/role-channels/role/:role — 按角色删除所有渠道授权
     */
    revokeByRole(ctx: any): Promise<void>;
};
export default _default;
