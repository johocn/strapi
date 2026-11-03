declare const _default: {
    "tire-package": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
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
                    targetField: string;
                    required: boolean;
                };
                baseMonths: {
                    type: string;
                    default: number;
                };
                storePrice: {
                    type: string;
                };
                pickupPrice: {
                    type: string;
                };
                extraMonthPrice: {
                    type: string;
                };
                overdueDayPrice: {
                    type: string;
                };
                durationText: {
                    type: string;
                };
                highlights: {
                    type: string;
                };
                enabled: {
                    type: string;
                    default: boolean;
                };
                sort: {
                    type: string;
                    default: number;
                };
            };
        };
    };
    "tire-addon": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
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
                    targetField: string;
                    required: boolean;
                };
                price: {
                    type: string;
                };
                unitText: {
                    type: string;
                };
                enabled: {
                    type: string;
                    default: boolean;
                };
                sort: {
                    type: string;
                    default: number;
                };
            };
        };
    };
    "tire-order": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
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
                orderNo: {
                    type: string;
                    required: boolean;
                    unique: boolean;
                };
                clientToken: {
                    type: string;
                    required: boolean;
                    unique: boolean;
                };
                source: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                customerName: {
                    type: string;
                    required: boolean;
                };
                phone: {
                    type: string;
                    required: boolean;
                };
                plateNo: {
                    type: string;
                };
                carType: {
                    type: string;
                    enum: string[];
                };
                tireSpec: {
                    type: string;
                };
                withWheelRim: {
                    type: string;
                    default: boolean;
                };
                serviceType: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                returnMethod: {
                    type: string;
                    enum: string[];
                };
                pickupDate: {
                    type: string;
                };
                pickupSlot: {
                    type: string;
                    enum: string[];
                };
                storageStartDate: {
                    type: string;
                    required: boolean;
                };
                expectedReturnDate: {
                    type: string;
                    required: boolean;
                };
                expireAt: {
                    type: string;
                };
                months: {
                    type: string;
                };
                packageSnapshot: {
                    type: string;
                };
                addons: {
                    type: string;
                };
                amountPackage: {
                    type: string;
                    default: number;
                };
                amountAddon: {
                    type: string;
                    default: number;
                };
                amountTotal: {
                    type: string;
                    default: number;
                };
                paymentMethod: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                paymentStatus: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                paidAmount: {
                    type: string;
                    default: number;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                outboundRequestStatus: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                outboundRequestedAt: {
                    type: string;
                };
                outboundNote: {
                    type: string;
                };
                inboundPhotos: {
                    type: string;
                    multiple: boolean;
                    allowedTypes: string[];
                };
                outboundPhotos: {
                    type: string;
                    multiple: boolean;
                    allowedTypes: string[];
                };
                locationCode: {
                    type: string;
                };
                inboundAt: {
                    type: string;
                };
                outboundAt: {
                    type: string;
                };
                storageOperator: {
                    type: string;
                    relation: string;
                    target: string;
                };
                note: {
                    type: string;
                };
                agreementAcceptedAt: {
                    type: string;
                };
                renewals: {
                    type: string;
                };
                timeline: {
                    type: string;
                };
            };
        };
    };
    "tire-sms-log": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
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
                order: {
                    type: string;
                    relation: string;
                    target: string;
                };
                type: {
                    type: string;
                    enum: string[];
                };
                phone: {
                    type: string;
                };
                content: {
                    type: string;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                sentAt: {
                    type: string;
                };
                operator: {
                    type: string;
                    relation: string;
                    target: string;
                };
            };
        };
    };
    "tire-faq": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
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
                question: {
                    type: string;
                    required: boolean;
                };
                answer: {
                    type: string;
                    required: boolean;
                };
                sort: {
                    type: string;
                    default: number;
                };
                enabled: {
                    type: string;
                    default: boolean;
                };
            };
        };
    };
    "tire-review": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
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
                nickname: {
                    type: string;
                };
                content: {
                    type: string;
                };
                rating: {
                    type: string;
                };
                showOnHome: {
                    type: string;
                    default: boolean;
                };
                sort: {
                    type: string;
                    default: number;
                };
            };
        };
    };
    "tire-gallery": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
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
                image: {
                    type: string;
                    multiple: boolean;
                    allowedTypes: string[];
                };
                caption: {
                    type: string;
                };
                sort: {
                    type: string;
                    default: number;
                };
            };
        };
    };
    "tire-config": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
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
                bannerTitle: {
                    type: string;
                };
                bannerSubtitle: {
                    type: string;
                };
                bannerImage: {
                    type: string;
                    multiple: boolean;
                    allowedTypes: string[];
                };
                serviceIntro: {
                    type: string;
                };
                warehouseConditions: {
                    type: string;
                };
                guarantees: {
                    type: string;
                };
                serviceAreaText: {
                    type: string;
                };
                warehouseAddress: {
                    type: string;
                };
                warehouseLat: {
                    type: string;
                };
                warehouseLng: {
                    type: string;
                };
                mapUrl: {
                    type: string;
                };
                contactPhone: {
                    type: string;
                };
                wechatQr: {
                    type: string;
                    multiple: boolean;
                    allowedTypes: string[];
                };
                dailyPickupLimitMorning: {
                    type: string;
                    default: number;
                };
                dailyPickupLimitAfternoon: {
                    type: string;
                    default: number;
                };
                paymentOnlineEnabled: {
                    type: string;
                    default: boolean;
                };
                depositEnabled: {
                    type: string;
                    default: boolean;
                };
                depositRatio: {
                    type: string;
                    default: number;
                };
                agreementText: {
                    type: string;
                };
                maxStorageDate: {
                    type: string;
                };
                announcement: {
                    type: string;
                };
                smsTemplateOverride: {
                    type: string;
                };
            };
        };
    };
};
export default _default;
