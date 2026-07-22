import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async list(ctx: any) {
    const service = strapi.plugin('zhao-studio').service('promo-channel');
    const { page = 1, pageSize = 10, scene } = ctx.query;
    const result = await service.listChannels({ page: Number(page), pageSize: Number(pageSize), scene });
    ctx.body = { data: result };
  },
  async findOne(ctx: any) {
    const service = strapi.plugin('zhao-studio').service('promo-channel');
    const result = await service.getChannel(ctx.params.id);
    ctx.body = { data: result };
  },
  async create(ctx: any) {
    const service = strapi.plugin('zhao-studio').service('promo-channel');
    const result = await service.createChannel(ctx.request.body.data);
    ctx.body = { data: result };
  },
  async update(ctx: any) {
    const service = strapi.plugin('zhao-studio').service('promo-channel');
    const result = await service.updateChannel(ctx.params.id, ctx.request.body.data);
    ctx.body = { data: result };
  },
  async delete(ctx: any) {
    const service = strapi.plugin('zhao-studio').service('promo-channel');
    await service.deleteChannel(ctx.params.id);
    ctx.body = { data: { success: true } };
  },
});
