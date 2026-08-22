import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /** 生成带参二维码（临时 QR_SCENE / 永久 QR_LIMIT_STR_SCENE） */
    create(data: {
        scene_key: string;
        title?: string;
        kind?: "temporary" | "permanent";
        expire_seconds?: number;
        qrcode_url?: string;
        remark?: string;
    }): Promise<any>;
    list(filters?: {
        page?: number;
        pageSize?: number;
        scene_key?: string;
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
    remove(id: number): Promise<any>;
    /** 事件日志查询（可按 openid 筛选，倒序分页） */
    events(filters?: {
        page?: number;
        pageSize?: number;
        openid?: string;
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
};
export default _default;
