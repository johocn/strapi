export interface PosterTemplate {
    id: string;
    documentId?: string;
    name: string;
    code: string;
    canvasWidth: number;
    canvasHeight: number;
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundMode?: string;
    isActive: boolean;
    isDefault: boolean;
    description?: string;
    requiredVariables?: string;
    optionalVariables?: string;
    elements?: any[];
}
export declare const usePosterTemplates: () => {
    templates: PosterTemplate[];
    loading: boolean;
    createTemplate: (data: Partial<PosterTemplate>) => Promise<any>;
    findOneTemplate: (id: string) => Promise<PosterTemplate & {
        id: string;
    }>;
    updateTemplate: (id: string, data: Partial<PosterTemplate>) => Promise<any>;
    deleteTemplate: (id: string) => Promise<void>;
    cloneTemplate: (id: string) => Promise<any>;
    batchSaveElements: (templateId: string, elements: any[]) => Promise<any>;
    fetchTemplates: () => Promise<void>;
};
export default usePosterTemplates;
//# sourceMappingURL=usePosterTemplates.d.ts.map