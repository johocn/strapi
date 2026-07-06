declare const _default: {
    "sync-controller": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        getDashboard(ctx: any): Promise<void>;
        getSyncRecords(ctx: any): Promise<void>;
        triggerSync(ctx: any): Promise<void>;
        batchSync(ctx: any): Promise<void>;
        deleteRemote(ctx: any): Promise<void>;
        checkHealth(ctx: any): Promise<void>;
    };
    "settings-controller": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        getConfig(ctx: any): Promise<void>;
        updateConfig(ctx: any): Promise<void>;
        testProvider(ctx: any): Promise<void>;
    };
    "api-controller": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        upload(ctx: any): Promise<void>;
        getSyncStatus(ctx: any): Promise<void>;
        mediaList(ctx: any): Promise<void>;
        getFolders(ctx: any): Promise<void>;
        createFolder(ctx: any): Promise<void>;
        deleteMedia(ctx: any): Promise<void>;
        repairFolders(ctx: any): Promise<void>;
    };
};
export default _default;
