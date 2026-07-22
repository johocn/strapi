import { Core } from '@strapi/strapi';
export interface ClickRequest {
    couponId: string;
    sourceTagId?: string;
    deviceFingerprint: string;
    utm?: {
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
        utmContent?: string;
        utmTerm?: string;
    };
    referer?: string;
    userAgent?: string;
    ip?: string;
}
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    orchestrate(req: ClickRequest): Promise<{
        clickId: string;
        resolvedLink: any;
        coupon: {
            documentId: string;
            couponId: any;
            amountDesc: any;
            product: any;
        };
    }>;
};
export default _default;
