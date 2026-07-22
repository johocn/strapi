declare const _default: {
    register: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => void;
    bootstrap: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => Promise<void>;
    destroy: ({ strapi }: {
        strapi: any;
    }) => void;
    config: {
        default: {
            attributionWindowDays: number;
            clickRateLimitSeconds: number;
            rateLimitMemoryMaxEntries: number;
        };
    };
    controllers: {
        coupon: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(ctx: any): Promise<void>;
            get(ctx: any): Promise<void>;
            listCollections(ctx: any): Promise<void>;
            getCollection(ctx: any): Promise<void>;
        };
        product: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(ctx: any): Promise<void>;
            get(ctx: any): Promise<void>;
        };
        meta: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            categories(ctx: any): Promise<void>;
            platforms(ctx: any): Promise<void>;
        };
        "admin-sync": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            trigger(ctx: any): Promise<void>;
        };
        candidate: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            approve(ctx: any): Promise<void>;
            reject(ctx: any): Promise<void>;
            approveProduct(ctx: any): Promise<void>;
            batchApprove(ctx: any): Promise<void>;
            batchReject(ctx: any): Promise<void>;
        };
    };
    contentTypes: {
        platform: {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                    description: string;
                };
                options: {
                    draftAndPublish: boolean;
                    comment: string;
                };
                pluginOptions: {
                    "content-manager": {
                        visible: boolean;
                    };
                    "content-type-builder": {
                        visible: boolean;
                    };
                };
                attributes: {
                    name: {
                        type: string;
                        required: boolean;
                    };
                    code: {
                        type: string;
                        required: boolean;
                        unique: boolean;
                        enum: string[];
                    };
                    promoSite: {
                        type: string;
                    };
                    couponRule: {
                        type: string;
                    };
                    apiEndpoint: {
                        type: string;
                    };
                    appKey: {
                        type: string;
                    };
                    appSecret: {
                        type: string;
                    };
                    signRule: {
                        type: string;
                    };
                    syncEnabled: {
                        type: string;
                        default: boolean;
                    };
                    syncMode: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    syncCron: {
                        type: string;
                    };
                    fetchConfig: {
                        type: string;
                    };
                };
            };
        };
        category: {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                    description: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                pluginOptions: {
                    "content-manager": {
                        visible: boolean;
                    };
                    "content-type-builder": {
                        visible: boolean;
                    };
                };
                attributes: {
                    name: {
                        type: string;
                        required: boolean;
                    };
                    code: {
                        type: string;
                        required: boolean;
                        unique: boolean;
                    };
                    platform: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    sort: {
                        type: string;
                        default: number;
                    };
                    icon: {
                        type: string;
                        allowedTypes: string[];
                        multiple: boolean;
                    };
                };
            };
        };
        coupon: {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                    description: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                pluginOptions: {
                    "content-manager": {
                        visible: boolean;
                    };
                    "content-type-builder": {
                        visible: boolean;
                    };
                };
                attributes: {
                    couponId: {
                        type: string;
                        required: boolean;
                        unique: boolean;
                    };
                    platform: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    category: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    promoLink: {
                        type: string;
                        required: boolean;
                    };
                    amountDesc: {
                        type: string;
                        required: boolean;
                    };
                    useRule: {
                        type: string;
                    };
                    useCondition: {
                        type: string;
                    };
                    useScope: {
                        type: string;
                    };
                    startAt: {
                        type: string;
                    };
                    endAt: {
                        type: string;
                    };
                    receiveCount: {
                        type: string;
                        default: number;
                    };
                    usedCount: {
                        type: string;
                        default: number;
                    };
                    originalPrice: {
                        type: string;
                    };
                    onlineAt: {
                        type: string;
                    };
                    offlineAt: {
                        type: string;
                    };
                    isRecommended: {
                        type: string;
                        default: boolean;
                    };
                    isHot: {
                        type: string;
                        default: boolean;
                    };
                    isNew: {
                        type: string;
                        default: boolean;
                    };
                    sortOrder: {
                        type: string;
                        default: number;
                    };
                    promoChannels: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    collection: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                };
            };
        };
        product: {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                    description: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                pluginOptions: {
                    "content-manager": {
                        visible: boolean;
                    };
                    "content-type-builder": {
                        visible: boolean;
                    };
                };
                attributes: {
                    productId: {
                        type: string;
                        required: boolean;
                        unique: boolean;
                    };
                    platform: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    title: {
                        type: string;
                        required: boolean;
                    };
                    mainImage: {
                        type: string;
                        allowedTypes: string[];
                        multiple: boolean;
                    };
                    detailUrl: {
                        type: string;
                    };
                    originalPrice: {
                        type: string;
                    };
                    couponAmount: {
                        type: string;
                    };
                    finalPrice: {
                        type: string;
                    };
                    sales30d: {
                        type: string;
                    };
                    reviewCount: {
                        type: string;
                    };
                    reviewScore: {
                        type: string;
                    };
                    brand: {
                        type: string;
                    };
                    category: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    coupon: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    isRecommended: {
                        type: string;
                        default: boolean;
                    };
                    isHot: {
                        type: string;
                        default: boolean;
                    };
                    isNew: {
                        type: string;
                        default: boolean;
                    };
                    sortOrder: {
                        type: string;
                        default: number;
                    };
                };
            };
        };
        "coupon-candidate": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                    description: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                pluginOptions: {
                    "content-manager": {
                        visible: boolean;
                    };
                    "content-type-builder": {
                        visible: boolean;
                    };
                };
                attributes: {
                    couponId: {
                        type: string;
                        required: boolean;
                    };
                    platform: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    category: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    amountDesc: {
                        type: string;
                        required: boolean;
                    };
                    couponAmount: {
                        type: string;
                    };
                    useCondition: {
                        type: string;
                    };
                    useScope: {
                        type: string;
                    };
                    startAt: {
                        type: string;
                    };
                    endAt: {
                        type: string;
                    };
                    receiveCount: {
                        type: string;
                    };
                    usedCount: {
                        type: string;
                    };
                    originalPrice: {
                        type: string;
                    };
                    onlineAt: {
                        type: string;
                    };
                    offlineAt: {
                        type: string;
                    };
                    promoLink: {
                        type: string;
                        required: boolean;
                    };
                    fetchedAt: {
                        type: string;
                        required: boolean;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                        required: boolean;
                    };
                    rejectReason: {
                        type: string;
                    };
                    importedCoupon: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                };
            };
        };
        "product-candidate": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                    description: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                pluginOptions: {
                    "content-manager": {
                        visible: boolean;
                    };
                    "content-type-builder": {
                        visible: boolean;
                    };
                };
                attributes: {
                    productId: {
                        type: string;
                        required: boolean;
                    };
                    platform: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    title: {
                        type: string;
                        required: boolean;
                    };
                    mainImage: {
                        type: string;
                        allowedTypes: string[];
                        multiple: boolean;
                    };
                    detailUrl: {
                        type: string;
                    };
                    originalPrice: {
                        type: string;
                    };
                    couponAmount: {
                        type: string;
                    };
                    finalPrice: {
                        type: string;
                    };
                    sales30d: {
                        type: string;
                    };
                    reviewCount: {
                        type: string;
                    };
                    reviewScore: {
                        type: string;
                    };
                    brand: {
                        type: string;
                    };
                    category: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    fetchedAt: {
                        type: string;
                        required: boolean;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                        required: boolean;
                    };
                    rejectReason: {
                        type: string;
                    };
                    importedProduct: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                };
            };
        };
        "coupon-collection": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                    description: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                pluginOptions: {
                    "content-manager": {
                        visible: boolean;
                    };
                    "content-type-builder": {
                        visible: boolean;
                    };
                };
                attributes: {
                    name: {
                        type: string;
                        required: boolean;
                    };
                    code: {
                        type: string;
                        required: boolean;
                        unique: boolean;
                    };
                    description: {
                        type: string;
                    };
                    coverImage: {
                        type: string;
                        allowedTypes: string[];
                        multiple: boolean;
                    };
                    coupons: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    startAt: {
                        type: string;
                    };
                    endAt: {
                        type: string;
                    };
                    sortOrder: {
                        type: string;
                        default: number;
                    };
                    status: {
                        type: string;
                        default: boolean;
                    };
                };
            };
        };
    };
    services: {
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
            filterCoupons: (list: import('./services/adapters/platform-adapter').CouponBatch[], pf?: import('./services/pre-filter').CouponPreFilter) => import('./services/adapters/platform-adapter').CouponBatch[];
            filterProducts: (list: import('./services/adapters/platform-adapter').ProductBatch[], pf?: import('./services/pre-filter').ProductPreFilter) => import('./services/adapters/platform-adapter').ProductBatch[];
        };
        candidate: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            upsertCouponCandidate(batch: import('./services/adapters/platform-adapter').CouponBatch, platformId: string, categoryId?: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            upsertProductCandidate(batch: import('./services/adapters/platform-adapter').ProductBatch, platformId: string, categoryId?: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
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
        };
    };
    routes: {
        "content-api": {
            type: "content-api";
            routes: {
                method: "GET" | "POST" | "PUT" | "DELETE";
                path: string;
                handler: string;
                config: {
                    auth: boolean;
                };
            }[];
        };
    };
    policies: {};
    middlewares: {};
};
export default _default;
