import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    myCustomers(ctx: any): Promise<void>;
    customerDetail(ctx: any): Promise<void>;
    touch(ctx: any): Promise<void>;
    listFollowUps(ctx: any): Promise<void>;
    createFollowUp(ctx: any): Promise<void>;
    updateFollowUp(ctx: any): Promise<void>;
};
export default _default;
