export declare function useChannelApi(): {
    getChannels: (params?: Record<string, any>) => Promise<any>;
    getChannel: (id: number) => Promise<any>;
    createChannel: (body: {
        name: string;
        parentChannel: number;
        description?: string;
        channelTier?: string;
    }) => Promise<any>;
    createRootChannel: (body: {
        name: string;
        description?: string;
    }) => Promise<any>;
    getChildren: (id: number) => Promise<any>;
    getHierarchy: (id: number) => Promise<any>;
    updateChannel: (id: number, body: Record<string, any>) => Promise<any>;
    deleteChannel: (id: number) => Promise<any>;
    getTierTree: (parentTier: string) => Promise<any>;
};
