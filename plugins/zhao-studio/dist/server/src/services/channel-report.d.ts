import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    getChannelReport(opts: {
        channelCode: string;
        startDate: string;
        endDate: string;
        groupBy?: "day" | "campaign" | "variant";
    }): Promise<any>;
    _resetCache(): void;
};
export default _default;
//# sourceMappingURL=channel-report.d.ts.map