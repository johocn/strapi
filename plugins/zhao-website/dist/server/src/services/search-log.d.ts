import { Core } from '@strapi/strapi';
import { AsyncWriter } from './utils/async-writer';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    _getWriter(): AsyncWriter;
    log(siteId: number, keyword: string, resultCount: number, ctx: any): Promise<void>;
    findAdmin(siteId: number, query?: any): Promise<any[]>;
    stats(siteId: number, days?: number): Promise<{
        total: number;
        topKeywords: [string, number][];
    }>;
};
export default _default;
