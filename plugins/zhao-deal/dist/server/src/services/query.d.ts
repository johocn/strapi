import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    listCoupons(query: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    getCoupon(couponId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    listProducts(query: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    getProduct(productId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    listCategories(platformCode?: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    listPlatforms(): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    listCollections(): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    getCollection(code: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
};
export default _default;
