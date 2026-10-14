import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    fullReindex(): Promise<{
        ok: boolean;
        error: any;
        counts?: undefined;
        errors?: undefined;
        durationMs?: undefined;
    } | {
        ok: boolean;
        counts: Record<string, number>;
        errors: string[];
        durationMs: number;
        error?: undefined;
    }>;
    syncOne(uid: string, entry: any): Promise<void>;
    removeOne(uid: string, entryId: any): Promise<void>;
};
export default _default;
