declare const _default: {
    query: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
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
    "pre-filter": () => {
        filterCoupons: (list: import('./adapters/platform-adapter').CouponBatch[], pf?: import('./pre-filter').CouponPreFilter) => import('./adapters/platform-adapter').CouponBatch[];
        filterProducts: (list: import('./adapters/platform-adapter').ProductBatch[], pf?: import('./pre-filter').ProductPreFilter) => import('./adapters/platform-adapter').ProductBatch[];
    };
    candidate: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        upsertCouponCandidate(batch: import('./adapters/platform-adapter').CouponBatch, platformId: string, categoryId?: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        upsertProductCandidate(batch: import('./adapters/platform-adapter').ProductBatch, platformId: string, categoryId?: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        approveCouponCandidate(documentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        rejectCouponCandidate(documentId: string, reason: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        approveProductCandidate(documentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    };
    sync: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        syncPlatformData(opts: {
            platformCode: string;
            type: "coupons" | "products";
            conditions?: any;
        }): Promise<{
            platformCode: string;
            type: "coupons" | "products";
            fetched: number;
            created: number;
            updated: number;
            skipped: number;
            errors: string[];
            duration: number;
        }>;
    };
    syncScheduler: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        shouldRunNow(platformCode: string, syncCron: string): Promise<boolean>;
        getLastRun(platformCode: string): Promise<Date | null>;
        run(): Promise<{
            processed: number;
        }>;
    };
    adapterRegistry: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => import('./adapters/adapter-registry').AdapterRegistry;
};
export default _default;
