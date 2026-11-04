declare const _default: {
    site: {
        get(ctx: any): Promise<void>;
    };
    order: {
        slots(ctx: any): Promise<void>;
        create(ctx: any): Promise<void>;
        detail(ctx: any): Promise<void>;
        renew(ctx: any): Promise<void>;
        requestOutbound(ctx: any): Promise<void>;
    };
    content: {
        agreement(ctx: any): Promise<void>;
        faqs(ctx: any): Promise<void>;
    };
    my: {
        me(ctx: any): Promise<void>;
        orders(ctx: any): Promise<void>;
        referral(ctx: any): Promise<void>;
        rewards(ctx: any): Promise<void>;
        shareRecords(ctx: any): Promise<void>;
    };
    referral: {
        preview(ctx: any): Promise<void>;
    };
    pay: {
        prepay(ctx: any): Promise<void>;
        notify(ctx: any): Promise<void>;
        mockPay(ctx: any): Promise<void>;
    };
    "admin-order": {
        find(ctx: any): Promise<void>;
        findOne(ctx: any): Promise<void>;
        update(ctx: any): Promise<void>;
        accept(ctx: any): Promise<void>;
        reject(ctx: any): Promise<void>;
        approveOutbound(ctx: any): Promise<void>;
        rejectOutbound(ctx: any): Promise<void>;
        inbound(ctx: any): Promise<void>;
        outbound(ctx: any): Promise<void>;
        payment(ctx: any): Promise<void>;
        refund(ctx: any): Promise<void>;
        exportExcel(ctx: any): Promise<void>;
    };
    "admin-inventory": {
        find(ctx: any): Promise<void>;
        expiring(ctx: any): Promise<void>;
        remind(ctx: any): Promise<void>;
    };
    "admin-catalog": {
        getConfig(ctx: any): Promise<void>;
        updateConfig(ctx: any): Promise<void>;
    };
    "admin-customer": {
        find(ctx: any): Promise<void>;
    };
    "admin-sms": {
        find(ctx: any): Promise<void>;
        update(ctx: any): Promise<void>;
    };
    "admin-content": {
        [x: string]: Function;
    };
    "admin-me": {
        find(ctx: any): Promise<void>;
    };
    "admin-referral": {
        find(ctx: any): Promise<void>;
        update(ctx: any): Promise<void>;
        grantFree(ctx: any): Promise<void>;
        shareRecords(ctx: any): Promise<void>;
        exportShareRecords(ctx: any): Promise<void>;
        rewards(ctx: any): Promise<void>;
    };
    "admin-payment": {
        find(ctx: any): Promise<void>;
        confirm(ctx: any): Promise<void>;
    };
};
export default _default;
