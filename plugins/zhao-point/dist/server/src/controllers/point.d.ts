import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    earn(ctx: any): Promise<void>;
    deduct(ctx: any): Promise<void>;
    balance(ctx: any): Promise<void>;
    records(ctx: any): Promise<void>;
    statistics(ctx: any): Promise<void>;
    redeem(ctx: any): Promise<void>;
    redeemRecords(ctx: any): Promise<void>;
    verifyPickup(ctx: any): Promise<void>;
    rules(ctx: any): Promise<void>;
    listProducts(ctx: any): Promise<void>;
    getProduct(ctx: any): Promise<void>;
    listPickupLocations(ctx: any): Promise<void>;
    getPickupLocation(ctx: any): Promise<void>;
    generateQRCode(ctx: any): Promise<void>;
    verifyByQRCode(ctx: any): Promise<void>;
    manualVerify(ctx: any): Promise<void>;
    getMyVerifications(ctx: any): Promise<void>;
    getEligibleActions(ctx: any): Promise<void>;
    getExchangeRate(ctx: any): Promise<void>;
    getFeatureFlags(ctx: any): Promise<void>;
    signIn(ctx: any): Promise<void>;
    getSignInStatus(ctx: any): Promise<void>;
    getTasks(ctx: any): Promise<void>;
};
export default _default;
