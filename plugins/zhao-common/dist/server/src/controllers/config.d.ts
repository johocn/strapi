import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    getSiteList(ctx: any): Promise<void>;
    getSite(ctx: any): Promise<void>;
    getSiteOne(ctx: any): Promise<void>;
    createSite(ctx: any): Promise<void>;
    updateSite(ctx: any): Promise<void>;
    updateSiteById(ctx: any): Promise<void>;
    deleteSite(ctx: any): Promise<void>;
    getThird(ctx: any): Promise<void>;
    getThirdOne(ctx: any): Promise<void>;
    createThird(ctx: any): Promise<void>;
    updateThird(ctx: any): Promise<void>;
    deleteThird(ctx: any): Promise<void>;
    getPoints(ctx: any): Promise<void>;
    updatePoints(ctx: any): Promise<void>;
    getOss(ctx: any): Promise<void>;
    updateOss(ctx: any): Promise<void>;
    getSso(ctx: any): Promise<void>;
    getSsoOne(ctx: any): Promise<void>;
    createSso(ctx: any): Promise<void>;
    updateSso(ctx: any): Promise<void>;
    deleteSso(ctx: any): Promise<void>;
    getPublic(ctx: any): Promise<void>;
    getAvailableChannels(ctx: any): Promise<void>;
};
export default _default;
