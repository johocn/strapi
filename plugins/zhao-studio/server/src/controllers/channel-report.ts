import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getChannelReport(ctx: any) {
    const service = strapi.plugin('zhao-studio').service('channel-report');
    const { channelCode, startDate, endDate, groupBy } = ctx.query;
    const result = await service.getChannelReport({ channelCode, startDate, endDate, groupBy });
    ctx.body = { data: result };
  },
});
