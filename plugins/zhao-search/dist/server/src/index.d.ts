declare const _default: {
    register: (_: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => void;
    bootstrap: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => Promise<void>;
    config: {
        default: {
            host: string;
            adminKey: string;
            indexPrefix: string;
            locales: string[];
        };
    };
    controllers: {
        "admin-reindex": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            reindex(ctx: any): Promise<void>;
            health(ctx: any): Promise<void>;
        };
    };
    services: {
        meili: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            locales: string[];
            indexUid: (locale: string) => string;
            ensureIndexes: () => Promise<void>;
            upsertDocuments: (locale: string, docs: import('./services/meili').KbDocument[]) => Promise<void>;
            deleteDocuments: (locale: string, ids: string[]) => Promise<void>;
            getStats: () => Promise<import('./services/meili').MeiliIndexStatus[]>;
            healthCheck: () => Promise<boolean>;
        };
        "content-sync": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            fullReindex(): Promise<{
                ok: boolean;
                error: any;
                counts?: undefined;
                errors?: undefined;
                durationMs?: undefined;
            } | {
                ok: boolean;
                counts: Record<string, number>;
                errors: string[];
                durationMs: number;
                error?: undefined;
            }>;
            syncOne(uid: string, entry: any): Promise<void>;
            removeOne(uid: string, entryId: any): Promise<void>;
        };
    };
    routes: {
        "admin-api": () => {
            type: "admin";
            prefix: string;
            routes: {
                method: string;
                path: string;
                handler: string;
                config: {
                    auth: boolean;
                    policies: any[];
                };
            }[];
        };
    };
};
export default _default;
