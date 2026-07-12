import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    list(siteId: number, query?: any): Promise<any[]>;
    findOne(siteId: number, documentId: string): Promise<any>;
    resolve(siteId: number, documentId: string, body: any): Promise<any>;
    createFromWebhook(payload: any): Promise<any>;
};
export default _default;
//# sourceMappingURL=sync-event.d.ts.map