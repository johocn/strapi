export interface AIProvider {
    name: string;
    displayName: string;
    endpoint: string;
    apiKeyHeader: string;
    models: string[];
    defaultModel: string;
    maxTokens: number;
    temperature: number;
}
export declare const aiProviders: Record<string, AIProvider>;
export declare function getProvider(providerId: string): AIProvider | undefined;
export declare function getAllProviders(): AIProvider[];
//# sourceMappingURL=aiProviders.d.ts.map