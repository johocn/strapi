import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    list(filters?: {
        page?: number;
        pageSize?: number;
        title?: string;
        publish_state?: string;
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
    /** 创建图文草稿：调 draft/add 写入 draft_id，本地 publish_state=draft */
    create(data: {
        title: string;
        author?: string;
        digest?: string;
        content?: string;
        thumb_media_id?: string;
        pic_url?: string;
        content_source_url?: string;
        show_cover_pic?: boolean;
    }): Promise<any>;
    /** 更新本地 + 重提草稿 draft/update；已发布返回 400 */
    update(id: number, data: Record<string, any>): Promise<any>;
    /** 发布：校验已提草稿 → freepublish/submit 记 publish_id 置 publishing；旁路登记 zhao-studio 发布台账 */
    publish(id: number): Promise<any>;
    /** 状态刷新：若 publishing 调 freepublish/get 刷新 publish_state */
    status(id: number): Promise<any>;
    /** 删除：调 draft/delete 后删本地 */
    remove(id: number): Promise<any>;
};
export default _default;
