declare const _default: {
    "admin-reindex": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        reindex(ctx: any): Promise<void>;
        health(ctx: any): Promise<void>;
    };
};
export default _default;
