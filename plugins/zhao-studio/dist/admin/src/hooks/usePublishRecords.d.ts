interface UsePublishRecordsParams {
    platformId?: string;
    accountId?: string;
}
interface PublishRecord {
    id: string;
    documentId?: string;
    title?: string;
    platformName?: string;
    platform?: {
        documentId?: string;
        name?: string;
    };
    account?: {
        documentId?: string;
        name?: string;
    };
    status: string;
    publishedAt?: string;
    errorMessage?: string;
    error?: string;
}
export declare const usePublishRecords: (params?: UsePublishRecordsParams) => {
    records: PublishRecord[];
    loading: boolean;
    refetch: () => Promise<void>;
};
export default usePublishRecords;
//# sourceMappingURL=usePublishRecords.d.ts.map