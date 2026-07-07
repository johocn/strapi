declare const _default: {
    "third-party-auth": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        authUrl(ctx: any): Promise<void>;
        qrconnectUrl(ctx: any): Promise<void>;
        callback(ctx: any): Promise<void>;
        publicConfig(ctx: any): Promise<void>;
        updateProfile(ctx: any): Promise<void>;
        jssdkSignature(ctx: any): Promise<void>;
        wechatRedirectCallback(ctx: any): Promise<void>;
    };
    "third-party-config": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        list(ctx: any): Promise<void>;
        create(ctx: any): Promise<void>;
        update(ctx: any): Promise<void>;
        delete(ctx: any): Promise<void>;
    };
    "third-party-account": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        list(ctx: any): Promise<void>;
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map