import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 软删除：将 deletedAt 设为当前时间
     * 使用 strapi.db.query() 直接操作，绕过自动过滤
     */
    softDelete(contentType: string, documentId: string): Promise<any>;
    /**
     * 恢复已软删除的记录
     * 使用 strapi.db.query() 直接操作，绕过自动过滤
     */
    restore(contentType: string, documentId: string): Promise<any>;
    /**
     * 查询已软删除的记录（管理端"回收站"视图）
     * 支持分页和排序
     */
    findDeleted(contentType: string, options?: {
        filters?: Record<string, any>;
        pagination?: any;
        sort?: any;
    }): Promise<any[] | {
        results: any[];
        pagination: {
            total: number;
            page: number;
            pageSize: any;
            pageCount: number;
        };
    }>;
};
export default _default;
