import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 按 openId 查找账号，优先返回「已绑定用户」的账号。
     *
     * 背景：早期脏数据可能遗留同一 openId 多条账号，其中旧账号 user 关联为空。
     * 若用 findFirst（按 id 顺序）恒兜住这条空关联账号，登录判定"未绑定"，
     * 导致同一 openId 每次登录都新建用户（微信 H5 反复重新登录、登录态无法持久）。
     * 这里改为拉取全部匹配项并优先取已绑用户的最新账号；全部为空关联时才回退首条。
     */
    findByOpenId(platform: string, appType: string, openId: string): Promise<any>;
    findByUnionId(platform: string, unionId: string): Promise<any>;
    findByUser(userId: number | string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    createAccount(data: Record<string, any>): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    updateAccount(documentId: string, data: Record<string, any>): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
    findAccounts(filters: Record<string, any>): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
};
export default _default;
//# sourceMappingURL=third-party-account.d.ts.map