declare const _default: {
    "quote-request": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findAdmin(siteId: number, query: any): Promise<{
            data: any[];
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        }>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        createAdmin(siteId: number, data: any): Promise<any>;
        updateAdmin(siteId: number, documentId: string, data: any): Promise<any>;
        deleteAdmin(siteId: number, documentId: string): Promise<any>;
    };
    "quote-field-rule": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findAdmin(siteId: number, query: any): Promise<{
            data: any[];
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        }>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        createAdmin(siteId: number, data: any): Promise<any>;
        updateAdmin(siteId: number, documentId: string, data: any): Promise<any>;
        deleteAdmin(siteId: number, documentId: string): Promise<any>;
    };
    "quote-price-rule": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findAdmin(siteId: number, query: any): Promise<{
            data: any[];
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        }>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        createAdmin(siteId: number, data: any): Promise<any>;
        updateAdmin(siteId: number, documentId: string, data: any): Promise<any>;
        deleteAdmin(siteId: number, documentId: string): Promise<any>;
    };
    "quote-price-formula": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findAdmin(siteId: number, query: any): Promise<{
            data: any[];
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        }>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        createAdmin(siteId: number, data: any): Promise<any>;
        updateAdmin(siteId: number, documentId: string, data: any): Promise<any>;
        deleteAdmin(siteId: number, documentId: string): Promise<any>;
    };
    "tracking-shipment": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findAdmin(siteId: number, query: any): Promise<{
            data: any[];
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        }>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        createAdmin(siteId: number, data: any): Promise<any>;
        updateAdmin(siteId: number, documentId: string, data: any): Promise<any>;
        deleteAdmin(siteId: number, documentId: string): Promise<any>;
    };
    "tracking-node": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findAdmin(siteId: number, query: any): Promise<{
            data: any[];
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        }>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        createAdmin(siteId: number, data: any): Promise<any>;
        updateAdmin(siteId: number, documentId: string, data: any): Promise<any>;
        deleteAdmin(siteId: number, documentId: string): Promise<any>;
    };
    "tracking-provider": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findAdmin(siteId: number, query: any): Promise<{
            data: any[];
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        }>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        createAdmin(siteId: number, data: any): Promise<any>;
        updateAdmin(siteId: number, documentId: string, data: any): Promise<any>;
        deleteAdmin(siteId: number, documentId: string): Promise<any>;
    };
    "contact-matrix": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findAdmin(siteId: number, query: any): Promise<{
            data: any[];
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        }>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        createAdmin(siteId: number, data: any): Promise<any>;
        updateAdmin(siteId: number, documentId: string, data: any): Promise<any>;
        deleteAdmin(siteId: number, documentId: string): Promise<any>;
    };
    "quote-engine": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        calculate(siteId: number, input: import('./quote-engine').QuoteInput): Promise<import('./quote-engine').QuoteResult | null>;
        calculateMulti(siteId: number, input: import('./quote-engine').QuoteInput): Promise<import('./quote-engine').QuoteResult[]>;
        saveQuote(siteId: number, quoteRequestId: string, result: import('./quote-engine').QuoteResult): Promise<void>;
    };
    "tracking-aggregator": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        getTracking(siteId: number, trackingNo: string): Promise<import('./tracking-aggregator').TrackingResult | null>;
        batchTracking(siteId: number, trackingNos: string[]): Promise<import('./tracking-aggregator').TrackingResult[]>;
        syncFromProvider(siteId: number, trackingNo: string): Promise<void>;
    };
    "dynamic-form": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        loadFields(siteId: number, context: {
            routeId?: string;
            serviceProvider?: string;
            customerType?: string;
            lang?: string;
        }): Promise<import('./dynamic-form').FormField[]>;
        validate(siteId: number, formData: Record<string, any>, fields: import('./dynamic-form').FormField[]): import('./dynamic-form').ValidationResult;
        resolveVisibility(formData: Record<string, any>, fields: import('./dynamic-form').FormField[]): import('./dynamic-form').FormField[];
    };
    "funnel-tracker": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        track(siteId: number, event: {
            funnelId?: string;
            eventName: string;
            visitorId: string;
            userId?: number;
            sessionId?: string;
            landingPageId?: string;
            quoteRequestId?: string;
            utm?: {
                source?: string;
                medium?: string;
                campaign?: string;
            };
            lang?: string;
            ctx?: any;
        }): Promise<void>;
        getStats(siteId: number, params: {
            funnelId: string;
            dateFrom?: string;
            dateTo?: string;
            lang?: string;
            utmSource?: string;
        }): Promise<import('./funnel-tracker').FunnelStats>;
    };
    "referral-engine": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        generateCode(siteId: number, referrerInfo: {
            name: string;
            contact: string;
        }): Promise<string>;
        applyCode(siteId: number, code: string, refereeInfo: {
            name: string;
            contact: string;
            channel?: string;
            source?: string;
        }): Promise<any>;
        markConverted(siteId: number, referralId: string, intentOrderId: string, conversionValue: number): Promise<void>;
        validateCode(siteId: number, code: string): Promise<{
            valid: boolean;
            referrerName?: string;
        }>;
        getStats(siteId: number, params: {
            dateFrom?: string;
            dateTo?: string;
            referrerCustomerId?: string;
        }): Promise<import('./referral-engine').ReferralStats>;
    };
    "customer-aggregator": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        upsert(siteId: number, info: {
            name: string;
            contactPhone?: string;
            contactEmail?: string;
            customerType?: string;
            country?: string;
            sourceChannel?: string;
            utmSource?: string;
        }): Promise<any>;
        upsertFromLead(siteId: number, leadId: string): Promise<any>;
        upsertFromQuote(siteId: number, quoteRequestId: string): Promise<any>;
        upsertFromOrder(siteId: number, intentOrderId: string): Promise<any>;
        getProfile(siteId: number, profileId: string): Promise<any>;
        merge(siteId: number, sourceId: string, targetId: string): Promise<any>;
        _extractPhone(contactStr: string): string;
        _computeStage(quoteCount: number, orderCount: number): string;
        _laterTime(a: string | null, b: string | null): string | null;
    };
    review: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findAdmin(siteId: number, query: any): Promise<{
            data: any[];
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        }>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        createAdmin(siteId: number, data: any): Promise<any>;
        updateAdmin(siteId: number, documentId: string, data: any): Promise<any>;
        deleteAdmin(siteId: number, documentId: string): Promise<any>;
    };
    subscription: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findAdmin(siteId: number, query: any): Promise<{
            data: any[];
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        }>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        createAdmin(siteId: number, data: any): Promise<any>;
        updateAdmin(siteId: number, documentId: string, data: any): Promise<any>;
        deleteAdmin(siteId: number, documentId: string): Promise<any>;
    };
    "landing-page": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findAdmin(siteId: number, query: any): Promise<{
            data: any[];
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        }>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        createAdmin(siteId: number, data: any): Promise<any>;
        updateAdmin(siteId: number, documentId: string, data: any): Promise<any>;
        deleteAdmin(siteId: number, documentId: string): Promise<any>;
    };
    "conversion-funnel": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findAdmin(siteId: number, query: any): Promise<{
            data: any[];
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        }>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        createAdmin(siteId: number, data: any): Promise<any>;
        updateAdmin(siteId: number, documentId: string, data: any): Promise<any>;
        deleteAdmin(siteId: number, documentId: string): Promise<any>;
    };
    "conversion-event": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findAdmin(siteId: number, query: any): Promise<{
            data: any[];
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        }>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        createAdmin(siteId: number, data: any): Promise<any>;
        updateAdmin(siteId: number, documentId: string, data: any): Promise<any>;
        deleteAdmin(siteId: number, documentId: string): Promise<any>;
    };
    "intent-order": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findAdmin(siteId: number, query: any): Promise<{
            data: any[];
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        }>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        createAdmin(siteId: number, data: any): Promise<any>;
        updateAdmin(siteId: number, documentId: string, data: any): Promise<any>;
        deleteAdmin(siteId: number, documentId: string): Promise<any>;
    };
    referral: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findAdmin(siteId: number, query: any): Promise<{
            data: any[];
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        }>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        createAdmin(siteId: number, data: any): Promise<any>;
        updateAdmin(siteId: number, documentId: string, data: any): Promise<any>;
        deleteAdmin(siteId: number, documentId: string): Promise<any>;
    };
    "customer-profile": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findAdmin(siteId: number, query: any): Promise<{
            data: any[];
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        }>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        createAdmin(siteId: number, data: any): Promise<any>;
        updateAdmin(siteId: number, documentId: string, data: any): Promise<any>;
        deleteAdmin(siteId: number, documentId: string): Promise<any>;
    };
};
export default _default;
