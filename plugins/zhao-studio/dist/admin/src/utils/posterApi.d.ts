export declare const posterApi: {
    listTemplates: (filters?: any) => Promise<any>;
    createTemplate: (data: any) => Promise<any>;
    findOneTemplate: (id: string) => Promise<any>;
    updateTemplate: (id: string, data: any) => Promise<any>;
    deleteTemplate: (id: string) => Promise<void>;
    cloneTemplate: (id: string) => Promise<any>;
    batchSaveElements: (templateId: string, elements: any[]) => Promise<any>;
};
//# sourceMappingURL=posterApi.d.ts.map