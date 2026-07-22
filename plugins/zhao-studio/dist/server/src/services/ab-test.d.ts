import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    listExperiments: (opts: {
        page: number;
        pageSize: number;
        channelId?: string;
        campaignId?: string;
        status?: string;
    }) => Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    getExperiment: (id: string) => Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    createExperiment: (data: any) => Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    startExperiment: (id: string) => Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
    stopExperiment: (id: string) => Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
    pickVariant: (opts: {
        channelId?: string;
        campaignId?: string;
    }) => Promise<any | null>;
    getExperimentReport: (experimentId: string, opts: {
        startDate: string;
        endDate: string;
    }) => Promise<{
        experiment: {
            documentId: string;
            name: any;
            status: any;
        };
        variants: any;
    }>;
};
export default _default;
//# sourceMappingURL=ab-test.d.ts.map