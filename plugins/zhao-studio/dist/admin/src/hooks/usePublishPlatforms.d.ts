interface PublishPlatform {
    id: string;
    documentId?: string;
    name: string;
    type?: string;
    appId?: string;
    appSecret?: string;
    callbackUrl?: string;
    description?: string;
    isActive?: boolean;
}
export declare const usePublishPlatforms: () => {
    platforms: PublishPlatform[];
    loading: boolean;
    createPlatform: (data: Partial<PublishPlatform>) => Promise<void>;
    updatePlatform: (id: string, data: Partial<PublishPlatform>) => Promise<void>;
    deletePlatform: (id: string) => Promise<void>;
};
export default usePublishPlatforms;
//# sourceMappingURL=usePublishPlatforms.d.ts.map