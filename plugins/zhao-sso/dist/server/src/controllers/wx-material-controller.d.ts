import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /** POST /wx/materials multipart {type,name,file} → 上传永久素材并落库 */
    create(ctx: any): Promise<void>;
    list(ctx: any): Promise<void>;
    delete(ctx: any): Promise<void>;
};
export default _default;
