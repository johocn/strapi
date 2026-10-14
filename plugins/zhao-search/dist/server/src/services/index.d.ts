declare const _default: {
    meili: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        locales: string[];
        indexUid: (locale: string) => string;
        ensureIndexes: () => Promise<void>;
        upsertDocuments: (locale: string, docs: import('./meili').KbDocument[]) => Promise<void>;
        deleteDocuments: (locale: string, ids: string[]) => Promise<void>;
        getStats: () => Promise<import('./meili').MeiliIndexStatus[]>;
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
export default _default;
