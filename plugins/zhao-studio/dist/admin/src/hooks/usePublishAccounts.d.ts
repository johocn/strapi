interface PublishAccount {
    id: string;
    documentId?: string;
    name: string;
    platformId?: string;
    platform?: {
        documentId?: string;
        name?: string;
    };
    accountId?: string;
    accessToken?: string;
    refreshToken?: string;
    isActive?: boolean;
    config?: any;
}
export declare const usePublishAccounts: () => {
    accounts: PublishAccount[];
    loading: boolean;
    fetchAccounts: (platformId?: string) => Promise<void>;
    createAccount: (data: Partial<PublishAccount>) => Promise<void>;
    updateAccount: (id: string, data: Partial<PublishAccount>) => Promise<void>;
    deleteAccount: (id: string) => Promise<void>;
};
export default usePublishAccounts;
//# sourceMappingURL=usePublishAccounts.d.ts.map