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
};
export default _default;
