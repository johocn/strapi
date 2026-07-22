import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    listCampaigns(opts: {
        page: number;
        pageSize: number;
        channelId?: string;
        status?: boolean;
    }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    getCampaign(id: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    createCampaign(data: {
        name: string;
        code: string;
        channel: string;
        description?: string;
        startAt: string;
        endAt: string;
        status?: boolean;
        budget?: number;
        actualCost?: number;
    }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    updateCampaign(id: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
    deleteCampaign(id: string): Promise<{
        documentId: import('@strapi/types/dist/modules/documents').ID;
        entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
    }>;
};
export default _default;
//# sourceMappingURL=promo-campaign.d.ts.map