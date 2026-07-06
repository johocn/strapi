declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    fetchTitles(sourceId: string): Promise<import('../utils/selectors').ScrapedTitle[]>;
    fetchContent(url: string, sourceId: string): Promise<import('../utils/selectors').ScrapedContent>;
};
export default _default;
//# sourceMappingURL=scraper.d.ts.map