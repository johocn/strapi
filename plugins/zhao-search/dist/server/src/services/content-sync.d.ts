import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    fullReindex(): Promise<{
        ok: boolean;
        error: string;
    }>;
    syncOne(_uid: string, _entry: any): Promise<void>;
    removeOne(_uid: string, _entryId: any): Promise<void>;
};
export default _default;
