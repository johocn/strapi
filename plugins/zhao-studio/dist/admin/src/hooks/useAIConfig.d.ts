interface AIConfig {
    enabled?: boolean;
    provider?: string;
    apiKey?: string;
    endpoint?: string;
    apiBase?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    isActive?: boolean;
}
export declare const useAIConfig: () => {
    config: AIConfig | null;
    loading: boolean;
    updateConfig: (data: Partial<AIConfig>) => Promise<void>;
    testConfig: (data: Partial<AIConfig>) => Promise<any>;
};
export default useAIConfig;
//# sourceMappingURL=useAIConfig.d.ts.map