import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /** 我的错题列表（默认 active） */
    listMy(ctx: any): Promise<void>;
    /** 待复习错题（错题重练队列） */
    dueMine(ctx: any): Promise<void>;
};
export default _default;
