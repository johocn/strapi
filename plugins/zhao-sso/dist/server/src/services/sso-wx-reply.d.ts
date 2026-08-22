import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    list: (filters?: {
        page?: number;
        pageSize?: number;
        trigger?: string;
        match?: string;
    }) => Promise<{
        data: any[];
        meta: {
            pagination: {
                page: number;
                pageSize: number;
                total: number;
            };
        };
    }>;
    findOne: (id: number) => Promise<any>;
    create: (data: {
        trigger?: string;
        match?: string;
        reply_type?: string;
        text?: string;
        title?: string;
        desc?: string;
        pic_url?: string;
        link_url?: string;
        sort?: number;
        enabled?: boolean;
    }) => Promise<any>;
    update: (id: number, data: Record<string, any>) => Promise<any>;
    remove: (id: number) => Promise<any>;
    /** 命中关键字规则：关键字精确命中 → 未命中取 fallback 兜底；均无返回 null */
    matchText(content: string): Promise<any>;
    /** 命中关注欢迎语规则（取未启用顺序的首条） */
    findWelcome(): Promise<any>;
};
export default _default;
