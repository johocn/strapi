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
        my: {
            me(ctx: any): Promise<void>;
            orders(ctx: any): Promise<void>;
            referral(ctx: any): Promise<void>;
            rewards(ctx: any): Promise<void>;
            shareRecords(ctx: any): Promise<void>;
        };
        referral: {
            preview(ctx: any): Promise<void>;
        };
        pay: {
            prepay(ctx: any): Promise<void>;
            notify(ctx: any): Promise<void>;
            mockPay(ctx: any): Promise<void>;
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
            refund(ctx: any): Promise<void>;
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
        "admin-referral": {
            find(ctx: any): Promise<void>;
            update(ctx: any): Promise<void>;
            grantFree(ctx: any): Promise<void>;
            shareRecords(ctx: any): Promise<void>;
            exportShareRecords(ctx: any): Promise<void>;
            rewards(ctx: any): Promise<void>;
        };
        "admin-payment": {
            find(ctx: any): Promise<void>;
            confirm(ctx: any): Promise<void>;
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
                            allow: "full" | "payment" | "read" | "storage";
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
                isFree?: undefined;
                freeReason?: undefined;
                referralCode?: undefined;
                paymentMethod?: undefined;
                rewardNo?: undefined;
                rewardAmount?: undefined;
            } | {
                orderNo: any;
                amountTotal: any;
                status: any;
                isFree: any;
                freeReason: any;
                referralCode: any;
                paymentMethod: any;
                rewardNo: any;
                rewardAmount: number;
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
                outstandingAmount: number;
                canPayOnline: boolean;
                rewardNo: any;
                rewardAmount: number;
                redemptionCode: any;
                redemptionCodeUsedAt: any;
                referralCode: any;
                referrerPhone: string;
                isFree: boolean;
                freeReason: any;
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
                redemptionCode: string;
            }>;
            outbound(orderNo: string, payload?: {
                photos?: unknown;
                operatorId?: number;
                redemptionCode?: string;
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
                paymentStatus: any;
                paidAmount: any;
                paymentNo: any;
                pending: boolean;
                duplicated: boolean;
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
        referral: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            ensureForPhone(phone: string, nickname?: string): Promise<any>;
            validate(referralCode: string): Promise<any>;
            attachReferral(order: any, referralCode: string, extra?: {
                openid?: string;
                deviceId?: string;
                ip?: string;
            }): Promise<any>;
            markValidOnInbound(orderNo: string): Promise<{
                duplicated: boolean;
                record: any;
                skipped?: undefined;
                reason?: undefined;
                referralCode?: undefined;
                referrerPhone?: undefined;
                completedCount?: undefined;
                rewarded?: undefined;
                reward?: undefined;
                pendingFreeCount?: undefined;
                recordId?: undefined;
            } | {
                skipped: boolean;
                reason: any;
                record: any;
                duplicated?: undefined;
                referralCode?: undefined;
                referrerPhone?: undefined;
                completedCount?: undefined;
                rewarded?: undefined;
                reward?: undefined;
                pendingFreeCount?: undefined;
                recordId?: undefined;
            } | {
                referralCode: any;
                referrerPhone: any;
                completedCount: number;
                rewarded: boolean;
                reward: any;
                pendingFreeCount: number;
                recordId: any;
                duplicated?: undefined;
                record?: undefined;
                skipped?: undefined;
                reason?: undefined;
            }>;
            issueReward(rc: any, options?: {
                source?: string;
                note?: string;
                force?: boolean;
            }): Promise<{
                issued: boolean;
                debt: boolean;
                reason: string;
                reward?: undefined;
                amount?: undefined;
            } | {
                issued: boolean;
                reason: string;
                debt?: undefined;
                reward?: undefined;
                amount?: undefined;
            } | {
                issued: boolean;
                reward: any;
                amount: number;
                debt?: undefined;
                reason?: undefined;
            }>;
            reserveReward(phone: string, amountPackage: number): Promise<{
                rewardNo: any;
                discount: number;
                amount: number;
                reward: any;
            }>;
            bindReward(rewardNo: string, orderNo: string): Promise<any>;
            releaseReward(rewardNo: string): Promise<any>;
            listRewards(phone: string): Promise<{
                rewards: {
                    rewardNo: any;
                    amount: number;
                    source: any;
                    status: any;
                    issuedAt: any;
                    expiresAt: any;
                    usedOrderNo: any;
                }[];
                available: {
                    rewardNo: any;
                    amount: number;
                    source: any;
                    status: any;
                    issuedAt: any;
                    expiresAt: any;
                    usedOrderNo: any;
                }[];
            }>;
            rollbackForOrder(orderNo: string): Promise<{
                rolledBack: boolean;
                completedCount?: undefined;
                pendingFreeCount?: undefined;
                debtCount?: undefined;
            } | {
                rolledBack: boolean;
                completedCount: number;
                pendingFreeCount: number;
                debtCount: number;
            }>;
            restoreUsedReward(order: any): Promise<{
                rewardNo: any;
            }>;
            markCompleted(orderNo: string): Promise<{
                duplicated: boolean;
                record: any;
                skipped?: undefined;
                reason?: undefined;
                referralCode?: undefined;
                referrerPhone?: undefined;
                completedCount?: undefined;
                rewarded?: undefined;
                reward?: undefined;
                pendingFreeCount?: undefined;
                recordId?: undefined;
            } | {
                skipped: boolean;
                reason: any;
                record: any;
                duplicated?: undefined;
                referralCode?: undefined;
                referrerPhone?: undefined;
                completedCount?: undefined;
                rewarded?: undefined;
                reward?: undefined;
                pendingFreeCount?: undefined;
                recordId?: undefined;
            } | {
                referralCode: any;
                referrerPhone: any;
                completedCount: number;
                rewarded: boolean;
                reward: any;
                pendingFreeCount: number;
                recordId: any;
                duplicated?: undefined;
                record?: undefined;
                skipped?: undefined;
                reason?: undefined;
            }>;
            consumeFree(phone: string): Promise<boolean>;
            getProfile(phone: string): Promise<any>;
        };
        payment: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            findOrder(orderNo: string): Promise<any>;
            outstandingOf(order: any): number;
            ensurePending(params: {
                order: any;
                amount: number;
                channel: string;
                idempotencyKey: string;
                provider?: string;
                externalNo?: string;
                payerOpenid?: string;
                raw?: any;
                note?: string;
            }): Promise<any>;
            settle(paymentNo: string, options?: {
                externalNo?: string;
                raw?: any;
            }): Promise<{
                duplicated: boolean;
                payment: any;
                order?: undefined;
            } | {
                duplicated: boolean;
                payment: any;
                order: {
                    orderNo: any;
                    paidAmount: any;
                    paymentStatus: string;
                };
            }>;
            recordManual(params: {
                order: any;
                amount: number;
                channel: string;
                idempotencyKey?: string;
                operatorId?: number | string;
                operatorName?: string;
                note?: string;
                status?: "pending" | "paid";
            }): Promise<{
                duplicated: boolean;
                payment: any;
                order?: undefined;
            } | {
                duplicated: boolean;
                payment: any;
                order: {
                    orderNo: any;
                    paidAmount: any;
                    paymentStatus: string;
                };
            } | {
                duplicated: boolean;
                payment: any;
                pending: boolean;
            }>;
            list(query: {
                page?: number;
                pageSize?: number;
                status?: string;
                orderNo?: string;
                channel?: string;
            }): Promise<{
                data: any[];
                meta: {
                    page: number;
                    pageSize: number;
                    total: number;
                    pageCount: number;
                };
            }>;
            refund(params: {
                order: any;
                amount: number;
                operatorId?: number | string;
                operatorName?: string;
                note?: string;
            }): Promise<{
                payment: any;
                order: {
                    orderNo: any;
                    paidAmount: number;
                    paymentStatus: string;
                };
                rollback: any;
            }>;
        };
        pay: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            provider(): "mock" | "wechat";
            mockSecret(): string;
            publicBase(): string;
            prepay(payload: any): Promise<any>;
            notify(payload: any, signature: string, rawBody?: string, headers?: any): Promise<any>;
            mockPay(paymentNo: string): Promise<{
                ok: boolean;
                duplicated: any;
                paidAmount: any;
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
                    rewardNo: {
                        type: string;
                        maxLength: number;
                    };
                    rewardAmount: {
                        type: string;
                        default: number;
                    };
                    redemptionCode: {
                        type: string;
                        maxLength: number;
                    };
                    redemptionCodeUsedAt: {
                        type: string;
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
                    referralCode: {
                        type: string;
                        maxLength: number;
                    };
                    referrerPhone: {
                        type: string;
                    };
                    wechatOpenid: {
                        type: string;
                        maxLength: number;
                        private: boolean;
                    };
                    isFree: {
                        type: string;
                        default: boolean;
                    };
                    freeReason: {
                        type: string;
                        enum: string[];
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
                    referralRewardCap: {
                        type: string;
                        default: number;
                    };
                    referralRewardValidDays: {
                        type: string;
                        default: number;
                    };
                    referralRewardYearLimit: {
                        type: string;
                        default: number;
                    };
                    referralDailyBindLimit: {
                        type: string;
                        default: number;
                    };
                    redemptionCodeEnabled: {
                        type: string;
                        default: boolean;
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
        "tire-referral-code": {
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
                    code: {
                        type: string;
                        required: boolean;
                        unique: boolean;
                        maxLength: number;
                    };
                    phone: {
                        type: string;
                        required: boolean;
                        unique: boolean;
                    };
                    nickname: {
                        type: string;
                        maxLength: number;
                    };
                    usedCount: {
                        type: string;
                        default: number;
                    };
                    completedCount: {
                        type: string;
                        default: number;
                    };
                    pendingFreeCount: {
                        type: string;
                        default: number;
                    };
                    totalFreeCount: {
                        type: string;
                        default: number;
                    };
                    debtCount: {
                        type: string;
                        default: number;
                    };
                };
            };
        };
        "tire-payment": {
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
                    paymentNo: {
                        type: string;
                        required: boolean;
                        unique: boolean;
                        maxLength: number;
                    };
                    orderNo: {
                        type: string;
                        required: boolean;
                        maxLength: number;
                    };
                    orderId: {
                        type: string;
                    };
                    channel: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    amount: {
                        type: string;
                        required: boolean;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    externalNo: {
                        type: string;
                        maxLength: number;
                    };
                    idempotencyKey: {
                        type: string;
                        required: boolean;
                        unique: boolean;
                        maxLength: number;
                    };
                    provider: {
                        type: string;
                        maxLength: number;
                    };
                    payerOpenid: {
                        type: string;
                        maxLength: number;
                        private: boolean;
                    };
                    operator: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    operatorName: {
                        type: string;
                        maxLength: number;
                    };
                    paidAt: {
                        type: string;
                    };
                    note: {
                        type: string;
                    };
                    raw: {
                        type: string;
                    };
                    refundedAmount: {
                        type: string;
                        default: number;
                    };
                    refundNote: {
                        type: string;
                    };
                };
            };
        };
        "tire-share-record": {
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
                    shareCode: {
                        type: string;
                        required: boolean;
                        maxLength: number;
                    };
                    referrerPhone: {
                        type: string;
                        required: boolean;
                    };
                    inviteePhone: {
                        type: string;
                    };
                    inviteeOpenid: {
                        type: string;
                        maxLength: number;
                    };
                    deviceId: {
                        type: string;
                        maxLength: number;
                    };
                    ip: {
                        type: string;
                        maxLength: number;
                    };
                    orderNo: {
                        type: string;
                        maxLength: number;
                    };
                    orderId: {
                        type: string;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    dedupeKey: {
                        type: string;
                        required: boolean;
                        unique: boolean;
                        maxLength: number;
                    };
                    riskReason: {
                        type: string;
                        maxLength: number;
                    };
                    boundAt: {
                        type: string;
                    };
                    validAt: {
                        type: string;
                    };
                };
            };
        };
        "tire-referral-reward": {
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
                    rewardNo: {
                        type: string;
                        required: boolean;
                        unique: boolean;
                        maxLength: number;
                    };
                    phone: {
                        type: string;
                        required: boolean;
                    };
                    amount: {
                        type: string;
                        default: number;
                    };
                    source: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    issuedAt: {
                        type: string;
                    };
                    expiresAt: {
                        type: string;
                    };
                    usedOrderNo: {
                        type: string;
                        maxLength: number;
                    };
                    usedAt: {
                        type: string;
                    };
                    note: {
                        type: string;
                        maxLength: number;
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
