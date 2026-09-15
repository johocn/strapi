import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    list: (params: {
        page?: number;
        pageSize?: number;
        status?: string;
        user?: number;
    }) => Promise<{
        records: any[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
        };
    }>;
    detail: (id: number) => Promise<any>;
    create: (data: any) => Promise<any>;
    update: (id: number, data: any) => Promise<any>;
    remove: (id: number) => Promise<void>;
    profitTrend: (id: number) => Promise<{
        points: {
            date: any;
            value: number;
            profit: number;
        }[];
    }>;
};
export default _default;
