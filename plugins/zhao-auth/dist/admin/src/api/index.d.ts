export declare function fetchMyInfo(): Promise<any>;
export declare function fetchUsers(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
}): Promise<any>;
export declare function fetchUserDetail(documentId: string): Promise<any>;
export declare function assignRole(userId: string, role: string): Promise<any>;
export declare function revokeRole(userId: string, role: string): Promise<any>;
export declare function updateChannelScope(userId: string, scope: {
    all: boolean;
    channelIds: string[];
}): Promise<any>;
export declare function fetchPermissionMatrix(): Promise<any>;
export declare function updateRolePermissions(role: string, permissions: string[]): Promise<any>;
export declare function resetRolePermissions(role: string): Promise<any>;
export declare function fetchAllActions(): Promise<any>;
export declare function fetchLogs(params?: {
    page?: number;
    pageSize?: number;
    action?: string;
}): Promise<any>;
export declare function checkPermission(userId: number, action: string): Promise<any>;
export declare function fetchAssignableRoles(): Promise<any>;
//# sourceMappingURL=index.d.ts.map