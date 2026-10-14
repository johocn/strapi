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
                error: string;
            }>;
            syncOne(_uid: string, _entry: any): Promise<void>;
            removeOne(_uid: string, _entryId: any): Promise<void>;
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
