import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    findByCode(channelCode: string): Promise<any>;
    trackClick(channelCode: string, utmParams?: Record<string, string>): Promise<{
        channel: any;
        utm: Record<string, string>;
    }>;
    listAll(): Promise<any[]>;
    count(where?: any): Promise<number>;
    listAllAdmin(): Promise<any[]>;
    create(data: {
        channel_code: string;
        channel_name: string;
        channel_type: string;
        utm_template?: string;
        is_active?: boolean;
        description?: string;
    }): Promise<any>;
    update(id: number, body: any): Promise<any>;
    /** 按渠道码 upsert：新建租户时由 Vendure 自动同步调用（防重），name 有值才覆盖 */
    upsertByCode(data: {
        channel_code: string;
        channel_name?: string;
        channel_type?: string;
        description?: string;
    }): Promise<any>;
    channelReport(): Promise<any[]>;
};
export default _default;
