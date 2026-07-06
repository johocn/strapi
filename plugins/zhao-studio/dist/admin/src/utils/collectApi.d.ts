export declare const collectApi: {
    getSources(): Promise<any>;
    createSource(data: any): Promise<any>;
    updateSource(id: string, data: any): Promise<any>;
    deleteSource(id: string): Promise<any>;
    createTask(sourceId: string): Promise<any>;
    getTasks(): Promise<any>;
    getTask(id: string): Promise<any>;
    fetchSelectedContent(taskId: string, selectedTitles: string[]): Promise<any>;
    confirmImport(taskId: string, confirmedContents: any[]): Promise<any>;
};
//# sourceMappingURL=collectApi.d.ts.map