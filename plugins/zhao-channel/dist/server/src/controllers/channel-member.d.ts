import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    _scopeSvc(): Core.Service;
    _channelFilter(ctx: any, field: string): Record<string, any> | null;
    _assertInScope(ctx: any, record: any, field: string): void;
    find(ctx: any): Promise<void>;
    findOne(ctx: any): Promise<void>;
    create(ctx: any): Promise<void>;
    update(ctx: any): Promise<void>;
    delete(ctx: any): Promise<void>;
};
export default _default;
