export interface CollectSource {
    id: string;
    name: string;
    url: string;
    type: 'template' | 'custom';
    template?: string;
    titleSelector?: string;
    contentSelector?: string;
    authorSelector?: string;
    dateSelector?: string;
    isActive: boolean;
    lastCollectedAt?: string;
}
export declare function useCollectSources(): {
    sources: CollectSource[];
    loading: boolean;
    error: string | null;
    fetchSources: () => Promise<void>;
    createSource: (data: any) => Promise<any>;
    updateSource: (id: string, data: any) => Promise<any>;
    deleteSource: (id: string) => Promise<void>;
};
//# sourceMappingURL=useCollectSources.d.ts.map