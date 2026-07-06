import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    find(ctx: any): Promise<void>;
    findOne(ctx: any): Promise<void>;
    create(ctx: any): Promise<void>;
    update(ctx: any): Promise<void>;
    delete(ctx: any): Promise<void>;
    importFile(ctx: any): Promise<void>;
    downloadTemplate(ctx: any): Promise<void>;
};
export default _default;
