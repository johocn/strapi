declare const _default: {
    register: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => void;
    bootstrap: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => Promise<void>;
    config: {
        default: {
            timezone: string;
            smsProvider: string;
        };
    };
    controllers: {
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
    };
    routes: {
        "content-api": {
            type: "content-api";
            routes: ({
                method: "GET" | "POST";
                path: string;
                handler: string;
                config: {
                    auth: boolean;
                };
            } | {
                method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
                path: string;
                handler: string;
                config: {
                    auth: boolean;
                    policies: {
                        name: string;
                        config: {
                            allow: "full" | "read" | "storage";
                        };
                    }[];
                };
            })[];
        };
    };
    services: {
        pricing: () => {
            calcPrice: ({ serviceType, months, packageDoc, addons }: import('./services/pricing').PriceInput) => {
                amountPackage: number;
                amountAddon: number;
                amountTotal: number;
            };
        };
        slot: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            remaining(date: string, slot: import('./services/slot').SlotName): Promise<number>;
            usage(date: string, slot: import('./services/slot').SlotName): Promise<{
                date: string;
                slot: import('./services/slot').SlotName;
                limit: number;
                used: number;
                remaining: number;
            }>;
            assertAvailable(date: string, slot: import('./services/slot').SlotName): Promise<{
                date: string;
                slot: import('./services/slot').SlotName;
                limit: number;
                used: number;
                remaining: number;
            }>;
        };
        "order-no": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            dayStamp: (now?: Date) => string;
            formatOrderNo: (now: Date, sequence: number) => string;
            generate(now?: Date): Promise<string>;
        };
        order: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            create(input: any): Promise<{
                orderNo: any;
                amountTotal: any;
                status: any;
                duplicated: boolean;
            } | {
                orderNo: any;
                amountTotal: any;
                status: any;
                duplicated?: undefined;
            }>;
            detail(orderNo: string, phone: string): Promise<{
                orderNo: any;
                status: any;
                customerName: any;
                phone: string;
                plateNo: any;
                carType: any;
                tireSpec: any;
                withWheelRim: boolean;
                serviceType: any;
                returnMethod: any;
                pickupDate: string;
                pickupSlot: any;
                storageStartDate: string;
                expectedReturnDate: string;
                expireAt: string;
                months: number;
                packageSnapshot: any;
                addons: any;
                amountPackage: number;
                amountAddon: number;
                amountTotal: number;
                paymentMethod: any;
                paymentStatus: any;
                paidAmount: number;
                outboundRequestStatus: any;
                outboundRequestedAt: any;
                outboundNote: any;
                note: any;
                renewals: any;
                timeline: any;
                locationCode: any;
                inboundAt: any;
                inboundPhotos: any;
                remainingDays: number;
                overdueDays: number;
                overdueFeeEstimate: number;
                canRenew: boolean;
                canRequestOutbound: boolean;
                createdAt: any;
            }>;
            renew(orderNo: string, months: number, paymentMethod?: string): Promise<{
                orderNo: any;
                months: number;
                amount: number;
                previousExpireAt: string;
                expireAt: string;
            }>;
            requestOutbound(orderNo: string, note?: string): Promise<{
                orderNo: any;
                outboundRequestStatus: string;
                outboundRequestedAt: string;
            }>;
            accept(orderNo: string, operatorId?: number): Promise<{
                orderNo: any;
                status: string;
            }>;
            reject(orderNo: string, reason?: string, operatorId?: number): Promise<{
                orderNo: any;
                status: string;
            }>;
            cancel(orderNo: string, reason?: string, operatorId?: number): Promise<{
                orderNo: any;
                status: string;
            }>;
            inbound(orderNo: string, payload?: {
                photos?: unknown;
                locationCode?: string;
                operatorId?: number;
            }): Promise<{
                orderNo: any;
                status: string;
                inboundAt: string;
                locationCode: string;
            }>;
            outbound(orderNo: string, payload?: {
                photos?: unknown;
                operatorId?: number;
            }): Promise<{
                orderNo: any;
                status: string;
                outboundAt: string;
            }>;
            complete(orderNo: string, payload?: any): Promise<{
                orderNo: any;
                status: string;
                outboundAt: string;
            }>;
            approveOutbound(orderNo: string, operatorId?: number): Promise<{
                orderNo: any;
                status: string;
                outboundRequestStatus: string;
            }>;
            rejectOutbound(orderNo: string, reason?: string, operatorId?: number): Promise<{
                orderNo: any;
                status: any;
                outboundRequestStatus: string;
            }>;
            updateDetails(orderNo: string, payload?: any, operatorId?: number): Promise<{
                orderNo: any;
                updated: string[];
            }>;
            registerPayment(orderNo: string, payload?: any, operatorId?: number): Promise<{
                orderNo: any;
                paymentMethod: string;
                paymentStatus: string;
                paidAmount: number;
            }>;
        };
        site: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            get(): Promise<{
                config: {};
                packages: any[];
                addons: any[];
                faqs: any[];
                reviews: any[];
                gallery: any[];
            }>;
        };
        notify: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            enqueue(type: import('./constants/sms-templates').SmsTemplateType, order: any, extra?: any): Promise<any>;
            list(query?: any): Promise<{
                data: any[];
                pagination: {
                    page: number;
                    pageSize: number;
                    total: number;
                    pageCount: number;
                };
            }>;
            update(id: number, payload?: any, operatorId?: number): Promise<any>;
        };
        "sms-provider": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            send(payload: import('./services/sms-provider').SmsPayload): Promise<import('./services/sms-provider').SmsResult>;
            providerName(): string;
        };
        export: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            ordersExcel(query?: any): Promise<{
                buffer: Buffer<any>;
                filename: string;
            }>;
        };
        catalog: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(name: "addons" | "packages" | "faqs" | "reviews" | "gallery"): Promise<any[]>;
            create(name: "addons" | "packages" | "faqs" | "reviews" | "gallery", payload?: any): Promise<any>;
            update(name: "addons" | "packages" | "faqs" | "reviews" | "gallery", id: unknown, payload?: any): Promise<any>;
            remove(name: "addons" | "packages" | "faqs" | "reviews" | "gallery", id: unknown): Promise<{
                id: number;
                deleted: boolean;
            }>;
            getConfig(): Promise<{}>;
            updateConfig(payload?: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        };
        inventory: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(query?: any): Promise<{
                data: any[];
                pagination: {
                    page: number;
                    pageSize: number;
                    total: number;
                    pageCount: number;
                };
            }>;
            expiring(query?: any): Promise<{
                data: any[];
                days: number;
                limitDate: string;
                total: number;
            }>;
            remind(payload?: any, operatorId?: number): Promise<{
                requested: number;
                queued: number;
                skipped: number;
            }>;
        };
        customer: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(query?: any): Promise<{
                data: any[];
                pagination: {
                    page: number;
                    pageSize: number;
                    total: number;
                    pageCount: number;
                };
            }>;
        };
    };
    contentTypes: {
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
    policies: {
        "admin-role": (ctx: any, policyConfig: any, { strapi }: {
            strapi: any;
        }) => Promise<boolean>;
    };
};
export default _default;
