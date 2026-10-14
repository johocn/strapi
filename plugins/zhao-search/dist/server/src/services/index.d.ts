declare const _default: {
    meili: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        locales: string[];
        indexUid: (locale: string) => string;
        ensureIndexes: () => Promise<void>;
        upsertDocuments: (locale: string, docs: import('./meili').KbDocument[]) => Promise<void>;
        deleteDocuments: (locale: string, ids: string[]) => Promise<void>;
        deleteByFilter: (locale: string, filter: string) => Promise<void>;
        getStats: () => Promise<import('./meili').MeiliIndexStatus[]>;
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
export default _default;
