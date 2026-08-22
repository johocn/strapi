import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    list(filters?: {
        page?: number;
        pageSize?: number;
        name?: string;
    }): Promise<{
        data: any[];
        meta: {
            pagination: {
                page: number;
                pageSize: number;
                total: number;
            };
        };
    }>;
    findOne(id: number): Promise<any>;
    create(data: {
        name: string;
        menu_json: any;
        enabled?: boolean;
    }): Promise<any>;
    update(id: number, data: {
        name?: string;
        menu_json?: any;
        enabled?: boolean;
    }): Promise<any>;
    remove(id: number): Promise<any>;
    /** 一键下发本地菜单到微信公众号 */
    publish(id: number): Promise<any>;
    /** 删除线上菜单 */
    deleteRemote(): Promise<any>;
    /** 获取线上菜单信息 */
    getRemote(): Promise<any>;
    /** 公众号已添加模板只读列表（模板消息配置用） */
    listTemplates(): Promise<any>;
};
export default _default;
