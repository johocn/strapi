interface ChatResponse {
    content: string;
    role: string;
}
export declare const useAIActions: () => {
    chat: (content: string) => Promise<ChatResponse>;
    generateSummary: (articleId: string, options?: {
        length?: number;
    }) => Promise<any>;
    optimizeTitle: (articleId: string, style?: string) => Promise<any>;
    rewriteContent: (articleId: string, tone?: string) => Promise<any>;
    convertLanguage: (articleId: string, target?: string) => Promise<any>;
    loading: boolean;
};
export default useAIActions;
//# sourceMappingURL=useAIActions.d.ts.map