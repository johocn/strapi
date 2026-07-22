import { Core } from '@strapi/strapi';
import { CouponBatch, ProductBatch } from './adapters/platform-adapter';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    upsertCouponCandidate(batch: CouponBatch, platformId: string, categoryId?: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    upsertProductCandidate(batch: ProductBatch, platformId: string, categoryId?: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    approveCouponCandidate(documentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    rejectCouponCandidate(documentId: string, reason: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    approveProductCandidate(documentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
};
export default _default;
