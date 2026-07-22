declare const _default: {
    click: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        click(ctx: any): Promise<void>;
    };
    source: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        identify(ctx: any): Promise<void>;
    };
    query: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        clicks(ctx: any): Promise<void>;
        orders(ctx: any): Promise<void>;
        sourceTags(ctx: any): Promise<void>;
    };
    report: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        attributionReport(ctx: any): Promise<void>;
    };
    "admin-sync": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        trigger(ctx: any): Promise<void>;
        attributionRun(ctx: any): Promise<void>;
    };
};
export default _default;
