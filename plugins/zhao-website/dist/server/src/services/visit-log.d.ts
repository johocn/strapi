import { Core } from '@strapi/strapi';
import { AsyncWriter } from './utils/async-writer';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    _getWriter(): AsyncWriter;
    enqueueCreate(siteId: number, data: any): Promise<void>;
    findAdmin(siteId: number, query?: any): Promise<any[]>;
    findMine(siteId: number, userId: number, query?: any): Promise<any[]>;
    stats(siteId: number, days?: number): Promise<{
        total: number;
        byType: any;
        days: number;
    }>;
    purgeOlderThan(days: number): Promise<number>;
};
export default _default;
