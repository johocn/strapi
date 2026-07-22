import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    listChannels(opts: {
        page: number;
        pageSize: number;
        scene?: string;
    }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    getChannel(id: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    createChannel(data: {
        name: string;
        code: string;
        description?: string;
        scene?: string;
        budget?: number;
        actualCost?: number;
    }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    updateChannel(id: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
    deleteChannel(id: string): Promise<{
        documentId: import('@strapi/types/dist/modules/documents').ID;
        entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
    }>;
    addPlatformConfig(channelId: string, data: {
        platform: string;
        promoPid?: string;
        promoLink?: string;
        isActive?: boolean;
    }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    updatePlatformConfig(configId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
    removePlatformConfig(configId: string): Promise<{
        documentId: import('@strapi/types/dist/modules/documents').ID;
        entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
    }>;
};
export default _default;
//# sourceMappingURL=promo-channel.d.ts.map