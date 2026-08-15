export declare function usePointApi(): {
    getRecords: (params?: Record<string, any>) => Promise<unknown>;
    adminAdjust: (body: any) => Promise<unknown>;
    batchAdjust: (body: any) => Promise<unknown>;
};
export declare function useRuleApi(): {
    getRules: (params?: Record<string, any>) => Promise<unknown>;
    createRule: (body: any) => Promise<unknown>;
    updateRule: (action: string, body: any) => Promise<unknown>;
    deleteRule: (action: string) => Promise<unknown>;
};
export declare function useProductApi(): {
    getProducts: (params?: Record<string, any>) => Promise<unknown>;
    createProduct: (body: any) => Promise<unknown>;
    updateProduct: (id: number, body: any) => Promise<unknown>;
    deleteProduct: (id: number) => Promise<unknown>;
    adjustStock: (id: number, delta: number) => Promise<unknown>;
};
export declare function useRedemptionApi(): {
    getRedemptions: (params?: Record<string, any>) => Promise<unknown>;
    reviewRedemption: (id: number, body: any) => Promise<unknown>;
};
export declare function useConfigApi(): {
    getConfig: () => Promise<unknown>;
    updateConfig: (body: any) => Promise<unknown>;
};
export declare function useVerificationApi(): {
    getVerifications: (params?: Record<string, any>) => Promise<unknown>;
    getVerificationStats: (channelId?: number) => Promise<unknown>;
};
export declare function useDashboardApi(): {
    getDashboard: () => Promise<unknown>;
};
