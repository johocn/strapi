import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    findByTags(tagIds: string[], types: string[], limit?: number, exclude?: string): Promise<Record<string, any[]>>;
    buildUrl(type: string, d: any): string;
    defaultTypes(): string[];
};
export default _default;
//# sourceMappingURL=related.d.ts.map