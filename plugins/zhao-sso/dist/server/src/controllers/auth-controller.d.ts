import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    login(ctx: any): Promise<void>;
    sendSms(ctx: any): Promise<void>;
    register(ctx: any): Promise<void>;
    verify(ctx: any): Promise<void>;
    refresh(ctx: any): Promise<void>;
    logout(ctx: any): Promise<void>;
};
export default _default;
