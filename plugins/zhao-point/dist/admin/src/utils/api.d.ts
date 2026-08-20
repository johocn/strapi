export declare function usePointApi(): {
    getRecords: (params?: Record<string, any>) => Promise<any>;
    adminAdjust: (body: any) => Promise<any>;
    batchAdjust: (body: any) => Promise<any>;
};
export declare function useRuleApi(): {
    getRules: (params?: Record<string, any>) => Promise<any>;
    createRule: (body: any) => Promise<any>;
    updateRule: (action: string, body: any) => Promise<any>;
    deleteRule: (action: string) => Promise<any>;
};
export declare function useProductApi(): {
    getProducts: (params?: Record<string, any>) => Promise<any>;
    createProduct: (body: any) => Promise<any>;
    updateProduct: (id: number, body: any) => Promise<any>;
    deleteProduct: (id: number) => Promise<any>;
    adjustStock: (id: number, delta: number) => Promise<any>;
};
export declare function useRedemptionApi(): {
    getRedemptions: (params?: Record<string, any>) => Promise<any>;
    reviewRedemption: (id: number, body: any) => Promise<any>;
};
export declare function useConfigApi(): {
    getConfig: () => Promise<any>;
    updateConfig: (body: any) => Promise<any>;
};
export declare function useVerificationApi(): {
    getVerifications: (params?: Record<string, any>) => Promise<any>;
    getVerificationStats: (channelId?: number) => Promise<any>;
};
export declare function useDashboardApi(): {
    getDashboard: () => Promise<any>;
};
