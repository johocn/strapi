declare const _default: {
    "source-resolver": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        identify(opts: import('./source-resolver').IdentifyOpts): Promise<{
            tag: import('@strapi/types/dist/modules/documents').AnyDocument;
            isNew: boolean;
        }>;
    };
    "rate-limiter": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        checkAndRecord(deviceFingerprint: string, couponId: string): Promise<{
            allowed: boolean;
        }>;
        _resetMemory(): void;
    };
    "click-orchestrator": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        orchestrate(req: import('./click-orchestrator').ClickRequest): Promise<{
            clickId: string;
            resolvedLink: any;
            coupon: {
                documentId: string;
                couponId: any;
                amountDesc: any;
                product: any;
            };
        }>;
    };
    attribution: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findMatchingClick: (order: any) => Promise<{
            click: any;
            quality: string;
            sourceTagId?: string;
        } | null>;
        run(opts?: {
            limit?: number;
        }): Promise<{
            total: number;
            matched: number;
            unmatched: number;
            byQuality: {
                pid_match: number;
                click_match: number;
                weak_match: number;
                fallback_match: number;
            };
        }>;
    };
    "order-sync": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        syncOrders(params: import('./order-sync').SyncOrdersParams): Promise<{
            fetched: number;
            created: number;
            updated: number;
            errors: string[];
        }>;
    };
    "order-sync-scheduler": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        shouldRunNow: (platformCode: string, syncCron: string) => Promise<boolean>;
        run(): Promise<{
            processed: number;
        }>;
    };
};
export default _default;
