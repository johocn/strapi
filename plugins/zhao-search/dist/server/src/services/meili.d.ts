import { Core } from '@strapi/strapi';
export interface KbDocument {
    id: string;
    type: string;
    sourceId: string;
    sourceSystem: "vendure" | "strapi";
    url: string;
    channelId: string;
    status: string;
    tags: string[];
    title: string;
    body: string;
    updatedAt: number;
}
export interface MeiliIndexStatus {
    index: string;
    documents: number;
    healthy: boolean;
}
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    locales: string[];
    indexUid: (locale: string) => string;
    ensureIndexes: () => Promise<void>;
    upsertDocuments: (locale: string, docs: KbDocument[]) => Promise<void>;
    deleteDocuments: (locale: string, ids: string[]) => Promise<void>;
    getStats: () => Promise<MeiliIndexStatus[]>;
    healthCheck: () => Promise<boolean>;
};
export default _default;
