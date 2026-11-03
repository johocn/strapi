import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    list(query?: any): Promise<{
        data: any[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
            pageCount: number;
        };
    }>;
    expiring(query?: any): Promise<{
        data: any[];
        days: number;
        limitDate: string;
        total: number;
    }>;
    remind(payload?: any, operatorId?: number): Promise<{
        requested: number;
        queued: number;
        skipped: number;
    }>;
};
export default _default;
