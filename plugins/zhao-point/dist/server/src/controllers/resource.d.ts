import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    lecturers: {
        list: (ctx: any) => Promise<void>;
        create: (ctx: any) => Promise<void>;
        findOne: (ctx: any) => Promise<void>;
        update: (ctx: any) => Promise<void>;
        del: (ctx: any) => Promise<void>;
    };
    venues: {
        list: (ctx: any) => Promise<void>;
        create: (ctx: any) => Promise<void>;
        findOne: (ctx: any) => Promise<void>;
        update: (ctx: any) => Promise<void>;
        del: (ctx: any) => Promise<void>;
    };
    schedules(ctx: any): Promise<void>;
    check(ctx: any): Promise<void>;
};
export default _default;
