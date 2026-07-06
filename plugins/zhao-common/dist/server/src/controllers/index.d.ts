declare const _default: {
    config: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
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
    "soft-delete": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        softDelete(ctx: any): Promise<void>;
        restore(ctx: any): Promise<void>;
        findDeleted(ctx: any): Promise<void>;
    };
    "site-config": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        get(ctx: any): Promise<void>;
        update(ctx: any): Promise<void>;
        getPublic(ctx: any): Promise<void>;
    };
    "site-template": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        list(ctx: any): Promise<void>;
        get(ctx: any): Promise<void>;
        create(ctx: any): Promise<void>;
        update(ctx: any): Promise<void>;
        delete(ctx: any): Promise<void>;
        applyToSite(ctx: any): Promise<void>;
    };
};
export default _default;
