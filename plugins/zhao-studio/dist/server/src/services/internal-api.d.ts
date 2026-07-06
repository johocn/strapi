import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    listArticles(filters: any): Promise<any[]>;
    getArticle(articleId: string): Promise<any>;
    searchArticles(query: string, filters: any): Promise<any[]>;
    getCategories(): Promise<string[]>;
    getChannels(): Promise<string[]>;
};
export default _default;
//# sourceMappingURL=internal-api.d.ts.map