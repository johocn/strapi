export interface AdContent {
    id: string;
    documentId?: string;
    name: string;
    adZone?: string | {
        documentId?: string;
        name?: string;
    };
    contentType: string;
    isActive: boolean;
    sortOrder?: number;
    priority?: number;
    title?: string;
    subtitle?: string;
    ctaText?: string;
    [key: string]: any;
}
interface UseAdContentsParams {
    adZoneId?: string;
}
export declare const useAdContents: (params?: UseAdContentsParams) => {
    contents: AdContent[];
    loading: boolean;
    createContent: (data: Partial<AdContent>) => Promise<void>;
    updateContent: (id: string, data: Partial<AdContent>) => Promise<void>;
    deleteContent: (id: string) => Promise<void>;
    fetchContents: () => Promise<void>;
};
export default useAdContents;
//# sourceMappingURL=useAdContents.d.ts.map