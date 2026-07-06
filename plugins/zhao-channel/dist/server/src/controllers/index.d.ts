declare const _default: {
    channel: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        _scopeSvc(): import('@strapi/types/dist/core').Service;
        _channelFilter(ctx: any, field: string): Record<string, any> | null;
        _assertInScope(ctx: any, record: any, field: string): void;
        find(ctx: any): Promise<void>;
        findOne(ctx: any): Promise<void>;
        create(ctx: any): Promise<void>;
        update(ctx: any): Promise<void>;
        delete(ctx: any): Promise<void>;
        register(ctx: any): Promise<void>;
        validate(ctx: any): Promise<void>;
        validatePublic(ctx: any): Promise<void>;
        registerPublic(ctx: any): Promise<void>;
        getNetwork(ctx: any): Promise<void>;
        getStats(ctx: any): Promise<void>;
        getPublic(ctx: any): Promise<void>;
        adminFind(ctx: any): Promise<void>;
        adminFindOne(ctx: any): Promise<void>;
        adminCreate(ctx: any): Promise<void>;
        adminCreateRoot(ctx: any): Promise<void>;
        adminGetChildren(ctx: any): Promise<void>;
        adminGetHierarchy(ctx: any): Promise<void>;
        adminUpdate(ctx: any): Promise<void>;
        updateConfig(ctx: any): Promise<void>;
        adminDelete(ctx: any): Promise<void>;
        adminGetTierTree(ctx: any): Promise<void>;
    };
    "channel-member": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        _scopeSvc(): import('@strapi/types/dist/core').Service;
        _channelFilter(ctx: any, field: string): Record<string, any> | null;
        _assertInScope(ctx: any, record: any, field: string): void;
        find(ctx: any): Promise<void>;
        findOne(ctx: any): Promise<void>;
        create(ctx: any): Promise<void>;
        update(ctx: any): Promise<void>;
        delete(ctx: any): Promise<void>;
    };
    "channel-permission": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        checkPermission(ctx: any): Promise<void>;
        getUserChannels(ctx: any): Promise<void>;
        batchGrant(ctx: any): Promise<void>;
    };
    "user-invite": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        _scopeSvc(): import('@strapi/types/dist/core').Service;
        _channelFilter(ctx: any, field: string): Record<string, any> | null;
        _assertInScope(ctx: any, record: any, field: string): void;
        find(ctx: any): Promise<void>;
        findOne(ctx: any): Promise<void>;
        create(ctx: any): Promise<void>;
        update(ctx: any): Promise<void>;
        delete(ctx: any): Promise<void>;
        useInvite(ctx: any): Promise<void>;
        getMyChain(ctx: any): Promise<void>;
        getMyDownstream(ctx: any): Promise<void>;
        getMyStats(ctx: any): Promise<void>;
        syncInvite(ctx: any): Promise<void>;
    };
    "channel-invite": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        join(ctx: any): Promise<void>;
    };
    "channel-stats": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        getDashboard(ctx: any): Promise<void>;
    };
};
export default _default;
