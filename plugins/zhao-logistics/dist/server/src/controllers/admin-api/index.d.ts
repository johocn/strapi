declare const _default: {
    "quote-request": {
        find(ctx: any): Promise<any>;
        findOne(ctx: any): Promise<any>;
        create(ctx: any): Promise<any>;
        update(ctx: any): Promise<any>;
        delete(ctx: any): Promise<any>;
    };
    "quote-field-rule": {
        find(ctx: any): Promise<any>;
        findOne(ctx: any): Promise<any>;
        create(ctx: any): Promise<any>;
        update(ctx: any): Promise<any>;
        delete(ctx: any): Promise<any>;
    };
    "quote-price-rule": {
        find(ctx: any): Promise<any>;
        findOne(ctx: any): Promise<any>;
        create(ctx: any): Promise<any>;
        update(ctx: any): Promise<any>;
        delete(ctx: any): Promise<any>;
    };
    "quote-price-formula": {
        find(ctx: any): Promise<any>;
        findOne(ctx: any): Promise<any>;
        create(ctx: any): Promise<any>;
        update(ctx: any): Promise<any>;
        delete(ctx: any): Promise<any>;
    };
    "tracking-shipment": {
        find(ctx: any): Promise<any>;
        findOne(ctx: any): Promise<any>;
        create(ctx: any): Promise<any>;
        update(ctx: any): Promise<any>;
        delete(ctx: any): Promise<any>;
    };
    "tracking-node": {
        find(ctx: any): Promise<any>;
        findOne(ctx: any): Promise<any>;
        create(ctx: any): Promise<any>;
        update(ctx: any): Promise<any>;
        delete(ctx: any): Promise<any>;
    };
    "tracking-provider": {
        find(ctx: any): Promise<any>;
        findOne(ctx: any): Promise<any>;
        create(ctx: any): Promise<any>;
        update(ctx: any): Promise<any>;
        delete(ctx: any): Promise<any>;
    };
    "contact-matrix": {
        find(ctx: any): Promise<any>;
        findOne(ctx: any): Promise<any>;
        create(ctx: any): Promise<any>;
        update(ctx: any): Promise<any>;
        delete(ctx: any): Promise<any>;
    };
    "quote-engine": {
        calculate(ctx: any): Promise<any>;
        calculateMulti(ctx: any): Promise<any>;
        saveQuote(ctx: any): Promise<any>;
    };
    "tracking-aggregator": {
        getTracking(ctx: any): Promise<any>;
        batchTracking(ctx: any): Promise<any>;
        syncFromProvider(ctx: any): Promise<any>;
    };
    "dynamic-form": {
        loadFields(ctx: any): Promise<any>;
        validate(ctx: any): Promise<any>;
    };
    review: {
        find(ctx: any): Promise<any>;
        findOne(ctx: any): Promise<any>;
        create(ctx: any): Promise<any>;
        update(ctx: any): Promise<any>;
        delete(ctx: any): Promise<any>;
    };
    subscription: {
        find(ctx: any): Promise<any>;
        findOne(ctx: any): Promise<any>;
        create(ctx: any): Promise<any>;
        update(ctx: any): Promise<any>;
        delete(ctx: any): Promise<any>;
    };
    "landing-page": {
        find(ctx: any): Promise<any>;
        findOne(ctx: any): Promise<any>;
        create(ctx: any): Promise<any>;
        update(ctx: any): Promise<any>;
        delete(ctx: any): Promise<any>;
    };
    "conversion-funnel": {
        find(ctx: any): Promise<any>;
        findOne(ctx: any): Promise<any>;
        create(ctx: any): Promise<any>;
        update(ctx: any): Promise<any>;
        delete(ctx: any): Promise<any>;
    };
    "conversion-event": {
        find(ctx: any): Promise<any>;
        findOne(ctx: any): Promise<any>;
        create(ctx: any): Promise<any>;
        update(ctx: any): Promise<any>;
        delete(ctx: any): Promise<any>;
    };
    "intent-order": {
        find(ctx: any): Promise<any>;
        findOne(ctx: any): Promise<any>;
        create(ctx: any): Promise<any>;
        update(ctx: any): Promise<any>;
        delete(ctx: any): Promise<any>;
    };
    referral: {
        find(ctx: any): Promise<any>;
        findOne(ctx: any): Promise<any>;
        create(ctx: any): Promise<any>;
        update(ctx: any): Promise<any>;
        delete(ctx: any): Promise<any>;
    };
    "customer-profile": {
        find(ctx: any): Promise<any>;
        findOne(ctx: any): Promise<any>;
        create(ctx: any): Promise<any>;
        update(ctx: any): Promise<any>;
        delete(ctx: any): Promise<any>;
    };
    "review-action": {
        approve(ctx: any): Promise<any>;
        reject(ctx: any): Promise<any>;
        reply(ctx: any): Promise<any>;
    };
    "intent-order-action": {
        convert(ctx: any): Promise<any>;
    };
    "customer-profile-action": {
        merge(ctx: any): Promise<any>;
    };
    "funnel-stats": {
        stats(ctx: any): Promise<any>;
    };
    "referral-stats": {
        stats(ctx: any): Promise<any>;
    };
};
export default _default;
