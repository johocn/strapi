import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    list(ctx: any): Promise<void>;
    create(ctx: any): Promise<void>;
    update(ctx: any): Promise<void>;
    delete(ctx: any): Promise<void>;
    /** 一键下发菜单 */
    publish(ctx: any): Promise<void>;
    /** 删除线上菜单 */
    deleteRemote(ctx: any): Promise<void>;
    /** 获取线上菜单信息 */
    getRemote(ctx: any): Promise<void>;
    /** 公众号已添加模板只读列表 */
    listTemplates(ctx: any): Promise<void>;
};
export default _default;
