declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    createTask(sourceId: string): Promise<any>;
    fetchSelectedContent(taskId: string, selectedTitles: string[]): Promise<any[]>;
    confirmImport(taskId: string, confirmedContents: any[]): Promise<{
        imported: number;
        articles: any[];
    }>;
};
export default _default;
//# sourceMappingURL=collect.d.ts.map