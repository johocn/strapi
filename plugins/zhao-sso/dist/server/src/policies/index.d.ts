declare const _default: {
    "sso-authenticated": (policyContext: any, config: any, { strapi }: {
        strapi: any;
    }) => Promise<boolean>;
    "fallback-authenticated": (policyContext: any, _config: any, _ctx: any) => boolean;
    "fallback-has-permission": (policyContext: any, _config: any, _ctx: any) => boolean;
};
export default _default;
