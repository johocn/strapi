import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    track(ctx: any): Promise<void>;
    /** 服务间渠道 upsert（Vendure 新建租户时自动同步）：共享密钥头鉴权，防渠道遗漏 */
    internalUpsert(ctx: any): Promise<void>;
};
export default _default;
