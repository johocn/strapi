export default ({ strapi }: { strapi: any }) => ({
  async list(ctx: any) {
    const user = ctx.state.user;
    const hasTenantPermission =
      user?.permissions?.some((p: any) =>
        typeof p === 'string' ? p === 'menu.tenant' : p?.action === 'menu.tenant'
      ) ?? false;

    const query: any = { ...ctx.query };
    if (!hasTenantPermission) {
      query.filters = { ...(query.filters || {}), scope: 'current' };
    }

    const drafts = await strapi
      .documents('plugin::zhao-studio.article-draft')
      .findMany(query);

    ctx.body = { data: drafts };
  },

  async findOne(ctx: any) {
    const { id } = ctx.params;

    const draft = await strapi
      .documents('plugin::zhao-studio.article-draft')
      .findOne({ documentId: id });

    ctx.body = { data: draft };
  },

  async create(ctx: any) {
    const user = ctx.state.user;
    const hasTenantPermission =
      user?.permissions?.some((p: any) =>
        typeof p === 'string' ? p === 'menu.tenant' : p?.action === 'menu.tenant'
      ) ?? false;

    const data: any = { ...ctx.request.body.data };
    if (!hasTenantPermission) {
      data.scope = 'current';
      delete data.scopeTenantId;
    }

    const draft = await strapi
      .documents('plugin::zhao-studio.article-draft')
      .create({ data });

    ctx.body = { data: draft };
  },

  async update(ctx: any) {
    const { id } = ctx.params;
    const user = ctx.state.user;
    const hasTenantPermission =
      user?.permissions?.some((p: any) =>
        typeof p === 'string' ? p === 'menu.tenant' : p?.action === 'menu.tenant'
      ) ?? false;

    const data: any = { ...ctx.request.body.data };
    if (!hasTenantPermission) {
      data.scope = 'current';
      delete data.scopeTenantId;
    }

    const draft = await strapi
      .documents('plugin::zhao-studio.article-draft')
      .update({ documentId: id, data });

    ctx.body = { data: draft };
  },

  async delete(ctx: any) {
    const { id } = ctx.params;

    await strapi
      .documents('plugin::zhao-studio.article-draft')
      .delete({ documentId: id });

    ctx.body = { data: { success: true } };
  },
});
