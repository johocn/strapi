declare const _default: {
    "sso-authenticated": (policyContext: any, config: any, { strapi }: {
        strapi: any;
    }) => Promise<boolean>;
    "fallback-authenticated": (policyContext: any, _config: any, { strapi }: {
        strapi: any;
    }) => Promise<boolean>;
    "fallback-has-permission": (policyContext: any, config: any, { strapi }: {
        strapi: any;
    }) => Promise<boolean>;
};
export default _default;
