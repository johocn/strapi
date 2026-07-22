import { default as React } from 'react';
export interface PermissionsContextValue {
    permissions: string[];
    channelScope: {
        all: boolean;
        channelIds: string[];
    };
    tenant: {
        documentId: string;
    } | null;
    user: {
        id: number;
        username: string;
        zhaoRoles: string[];
    } | null;
    loading: boolean;
    error: Error | null;
    refresh: () => void;
    hasPermission: (action: string) => boolean;
}
export declare const PermissionsProvider: React.FC<{
    children: React.ReactNode;
}>;
export declare const useMyPermissions: () => PermissionsContextValue;
export default PermissionsProvider;
//# sourceMappingURL=PermissionsProvider.d.ts.map