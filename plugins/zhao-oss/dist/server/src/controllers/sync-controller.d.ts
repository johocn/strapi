import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    getDashboard(ctx: any): Promise<void>;
    getSyncRecords(ctx: any): Promise<void>;
    triggerSync(ctx: any): Promise<void>;
    batchSync(ctx: any): Promise<void>;
    deleteRemote(ctx: any): Promise<void>;
    checkHealth(ctx: any): Promise<void>;
};
export default _default;
