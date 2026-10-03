import type { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    getAuthorizeUrl(ctx: any): Promise<void>;
    handleCallback(ctx: any): Promise<void>;
    getStatus(ctx: any): Promise<void>;
    revoke(ctx: any): Promise<void>;
};
export default _default;
//# sourceMappingURL=oauth.d.ts.map