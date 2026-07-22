declare const _default: {
    coupon: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        list(ctx: any): Promise<void>;
        get(ctx: any): Promise<void>;
        listCollections(ctx: any): Promise<void>;
        getCollection(ctx: any): Promise<void>;
    };
    product: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        list(ctx: any): Promise<void>;
        get(ctx: any): Promise<void>;
    };
    meta: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        categories(ctx: any): Promise<void>;
        platforms(ctx: any): Promise<void>;
    };
    "admin-sync": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        trigger(ctx: any): Promise<void>;
    };
    candidate: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        approve(ctx: any): Promise<void>;
        reject(ctx: any): Promise<void>;
        approveProduct(ctx: any): Promise<void>;
        batchApprove(ctx: any): Promise<void>;
        batchReject(ctx: any): Promise<void>;
    };
};
export default _default;
