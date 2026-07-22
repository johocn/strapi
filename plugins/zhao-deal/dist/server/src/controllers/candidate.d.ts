import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    approve(ctx: any): Promise<void>;
    reject(ctx: any): Promise<void>;
    approveProduct(ctx: any): Promise<void>;
    batchApprove(ctx: any): Promise<void>;
    batchReject(ctx: any): Promise<void>;
};
export default _default;
