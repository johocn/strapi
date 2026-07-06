export declare const aiApi: {
    getConfig(): Promise<any>;
    updateConfig(data: any): Promise<any>;
    testConnection(provider: string, apiKey: string, endpoint?: string): Promise<any>;
    generateSummary(articleId: string, length?: number): Promise<any>;
    optimizeTitle(articleId: string, style: "formal" | "casual" | "shocking"): Promise<any>;
    rewriteContent(articleId: string, tone: "formal" | "casual" | "humorous"): Promise<any>;
    convertLanguage(articleId: string, target: "simplified" | "traditional"): Promise<any>;
};
//# sourceMappingURL=aiApi.d.ts.map