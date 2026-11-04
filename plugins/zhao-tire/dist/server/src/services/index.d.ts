declare const _default: {
    pricing: () => {
        calcPrice: ({ serviceType, months, packageDoc, addons }: import('./pricing').PriceInput) => {
            amountPackage: number;
            amountAddon: number;
            amountTotal: number;
        };
    };
    slot: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        remaining(date: string, slot: import('./slot').SlotName): Promise<number>;
        usage(date: string, slot: import('./slot').SlotName): Promise<{
            date: string;
            slot: import('./slot').SlotName;
            limit: number;
            used: number;
            remaining: number;
        }>;
        assertAvailable(date: string, slot: import('./slot').SlotName): Promise<{
            date: string;
            slot: import('./slot').SlotName;
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
        enqueue(type: import('../constants/sms-templates').SmsTemplateType, order: any, extra?: any): Promise<any>;
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
        send(payload: import('./sms-provider').SmsPayload): Promise<import('./sms-provider').SmsResult>;
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
        prepay(payload: any): Promise<{
            paid: boolean;
            paymentNo: any;
            amount: any;
            provider?: undefined;
            mock?: undefined;
            payUrl?: undefined;
            orderNo?: undefined;
        } | {
            paymentNo: any;
            amount: any;
            provider: "mock";
            mock: boolean;
            payUrl: string;
            orderNo: any;
            paid?: undefined;
        }>;
        notify(payload: any, signature: string): Promise<{
            ok: boolean;
            duplicated: any;
            paidAmount: any;
        }>;
        mockPay(paymentNo: string): Promise<{
            ok: boolean;
            duplicated: any;
            paidAmount: any;
        }>;
    };
};
export default _default;
