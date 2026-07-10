declare const _default: {
    quote: {
        loadFields(ctx: any): Promise<any>;
        calculate(ctx: any): Promise<any>;
        submit(ctx: any): Promise<any>;
    };
    tracking: {
        getTracking(ctx: any): Promise<any>;
        batch(ctx: any): Promise<any>;
        subscribe(ctx: any): Promise<any>;
    };
    "contact-matrix": {
        getByLang(ctx: any): Promise<any>;
    };
    review: {
        list(ctx: any): Promise<any>;
        submit(ctx: any): Promise<any>;
    };
    "landing-page": {
        getBySlug(ctx: any): Promise<any>;
    };
    "intent-order": {
        getMyOrder(ctx: any): Promise<any>;
    };
    funnel: {
        track(ctx: any): Promise<any>;
    };
    referral: {
        apply(ctx: any): Promise<any>;
        validate(ctx: any): Promise<any>;
    };
    "customer-profile": {
        getMyProfile(ctx: any): Promise<any>;
    };
};
export default _default;
