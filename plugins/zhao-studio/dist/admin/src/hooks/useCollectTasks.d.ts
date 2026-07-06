export interface CollectTask {
    id: string;
    source: any;
    titles: any[];
    selectedTitles: any[];
    status: string;
    error?: string;
    createdAt: string;
}
export declare function useCollectTasks(): {
    tasks: CollectTask[];
    loading: boolean;
    error: string | null;
    fetchTasks: () => Promise<void>;
    createTask: (sourceId: string) => Promise<any>;
    getTask: (id: string) => Promise<any>;
    fetchSelectedContent: (taskId: string, selectedTitles: string[]) => Promise<any>;
    confirmImport: (taskId: string, confirmedContents: any[]) => Promise<any>;
};
//# sourceMappingURL=useCollectTasks.d.ts.map