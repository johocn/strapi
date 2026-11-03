export declare const API_BASE = "/api/zhao-tire/v1/admin";
export declare const ME_URL = "/api/zhao-tire/v1/admin/me";
export declare const FULL_ROLES: string[];
export type Me = {
    id: number;
    roleCodes: string[];
};
export type PermissionState = {
    loading: boolean;
    me: Me | null;
    canFull: boolean;
    canStorage: boolean;
    error?: string;
};
export declare const canFullAccess: (roleCodes: string[]) => boolean;
export declare const canStorageAccess: (roleCodes: string[]) => boolean;
export declare const errorMessage: (error: unknown) => string;
export declare const absoluteMediaUrl: (url?: string | null) => string;
export declare function useTireApi(): {
    getMe: () => Promise<Me>;
    listOrders: (params: Record<string, any>) => Promise<any>;
    getOrder: (id: number) => Promise<any>;
    updateOrder: (id: number, body: any) => Promise<any>;
    orderAction: (id: number, action: string, body?: any) => Promise<any>;
    submitOrderPhotos: (id: number, action: "inbound" | "outbound", files: File[], extra?: Record<string, any>) => Promise<any>;
    exportOrders: (params: Record<string, any>) => Promise<Blob>;
    listInventory: (params: Record<string, any>) => Promise<any>;
    listExpiring: (params: Record<string, any>) => Promise<any>;
    remindInventory: (ids: number[]) => Promise<any>;
    listCustomers: (params: Record<string, any>) => Promise<any>;
    listCollection: (name: string) => Promise<any>;
    createCollection: (name: string, body: any) => Promise<any>;
    updateCollection: (name: string, id: number, body: any) => Promise<any>;
    removeCollection: (name: string, id: number) => Promise<any>;
    getConfig: () => Promise<any>;
    updateConfig: (body: any) => Promise<any>;
    listSmsLogs: (params: Record<string, any>) => Promise<any>;
    updateSmsLog: (id: number, body: any) => Promise<any>;
    uploadImage: (file: File) => Promise<{
        id: number;
        url: string;
        name: string;
    }>;
};
export type TireApi = ReturnType<typeof useTireApi>;
