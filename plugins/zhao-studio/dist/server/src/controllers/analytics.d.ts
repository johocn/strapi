import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    trackPageView(ctx: any): Promise<void>;
    trackAdClick(ctx: any): Promise<void>;
    trackReadBehavior(ctx: any): Promise<void>;
    trackUserRegister(ctx: any): Promise<void>;
    listAdSlots(ctx: any): Promise<void>;
    createAdSlot(ctx: any): Promise<void>;
    updateAdSlot(ctx: any): Promise<void>;
    deleteAdSlot(ctx: any): Promise<void>;
    getOverview(ctx: any): Promise<void>;
    getArticleStats(ctx: any): Promise<void>;
    getAdSlotStats(ctx: any): Promise<void>;
    getDeviceStats(ctx: any): Promise<void>;
    getRegionStats(ctx: any): Promise<void>;
    getUserStats(ctx: any): Promise<void>;
    findOneAdSlot(ctx: any): Promise<void>;
};
export default _default;
//# sourceMappingURL=analytics.d.ts.map