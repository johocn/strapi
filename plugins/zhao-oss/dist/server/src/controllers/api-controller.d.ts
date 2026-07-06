import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    upload(ctx: any): Promise<void>;
    getSyncStatus(ctx: any): Promise<void>;
    mediaList(ctx: any): Promise<void>;
    getFolders(ctx: any): Promise<void>;
    createFolder(ctx: any): Promise<void>;
    deleteMedia(ctx: any): Promise<void>;
    repairFolders(ctx: any): Promise<void>;
};
export default _default;
