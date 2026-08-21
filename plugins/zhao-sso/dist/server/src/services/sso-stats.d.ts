import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    getSopStats(opts: {
        from?: string;
        to?: string;
        scene?: string;
    }): Promise<{
        from: string;
        to: string;
        summary: {
            sceneCount: number;
            total: number;
            sent: number;
            failed: number;
            quotaLimited: number;
            pending: number;
            sentRate: number;
        };
        rows: any[];
    }>;
};
export default _default;
