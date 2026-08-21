import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    list(ctx: any): Promise<void>;
    detail(ctx: any): Promise<void>;
    adminList(ctx: any): Promise<void>;
    adminFindOne(ctx: any): Promise<void>;
    adminCreate(ctx: any): Promise<void>;
    adminUpdate(ctx: any): Promise<void>;
    adminDelete(ctx: any): Promise<void>;
    adminActivities(ctx: any): Promise<void>;
    adminDuplicateActivity(ctx: any): Promise<void>;
    adminGenerate(ctx: any): Promise<void>;
};
export default _default;
