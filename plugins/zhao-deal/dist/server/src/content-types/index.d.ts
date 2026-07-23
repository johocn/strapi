declare const _default: {
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
                coupons: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                products: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                categories: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
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
                coupons: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                products: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
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
                product: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                clickEvents: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
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
export default _default;
