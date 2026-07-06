export declare const publishApi: {
    listPlatforms(): Promise<any>;
    createPlatform(data: any): Promise<any>;
    updatePlatform(id: string, data: any): Promise<any>;
    deletePlatform(id: string): Promise<any>;
    listAccounts(platformId?: string): Promise<any>;
    createAccount(data: any): Promise<any>;
    updateAccount(id: string, data: any): Promise<any>;
    deleteAccount(id: string): Promise<any>;
    publishArticle(articleId: string, accountIds: string[]): Promise<any>;
    listRecords(articleId?: string): Promise<any>;
    retryPublish(recordId: string): Promise<any>;
    syncStatus(articleId: string): Promise<any>;
};
//# sourceMappingURL=publishApi.d.ts.map