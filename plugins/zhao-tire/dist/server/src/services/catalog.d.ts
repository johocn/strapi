import { Core } from '@strapi/strapi';
type CollectionName = "packages" | "addons" | "faqs" | "reviews" | "gallery";
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    list(name: CollectionName): Promise<any[]>;
    create(name: CollectionName, payload?: any): Promise<any>;
    update(name: CollectionName, id: unknown, payload?: any): Promise<any>;
    remove(name: CollectionName, id: unknown): Promise<{
        id: number;
        deleted: boolean;
    }>;
    getConfig(): Promise<{}>;
    updateConfig(payload?: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
};
export default _default;
