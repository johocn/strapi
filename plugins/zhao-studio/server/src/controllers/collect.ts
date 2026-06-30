// server/src/controllers/collect.ts

export default ({ strapi }: { strapi: any }) => ({
  async listSources(ctx: any) {
    const sources = await strapi
      .documents('plugin::zhao-studio.collect-source')
      .findMany();

    ctx.body = { data: sources };
  },

  async createSource(ctx: any) {
    const { data } = ctx.request.body;

    const source = await strapi
      .documents('plugin::zhao-studio.collect-source')
      .create({ data });

    ctx.body = { data: source };
  },

  async updateSource(ctx: any) {
    const { id } = ctx.params;
    const { data } = ctx.request.body;

    const source = await strapi
      .documents('plugin::zhao-studio.collect-source')
      .update({ documentId: id, data });

    ctx.body = { data: source };
  },

  async deleteSource(ctx: any) {
    const { id } = ctx.params;

    const source = await strapi
      .documents('plugin::zhao-studio.collect-source')
      .delete({ documentId: id });

    ctx.body = { data: source };
  },

  async createTask(ctx: any) {
    const { sourceId } = ctx.request.body;

    const collectService = strapi.plugin('zhao-studio').service('collect');
    const task = await collectService.createTask(sourceId);

    ctx.body = { data: task };
  },

  async fetchSelectedContent(ctx: any) {
    const { taskId } = ctx.params;
    const { selectedTitles } = ctx.request.body;

    const collectService = strapi.plugin('zhao-studio').service('collect');
    const contents = await collectService.fetchSelectedContent(taskId, selectedTitles);

    ctx.body = { data: contents };
  },

  async confirmImport(ctx: any) {
    const { taskId } = ctx.params;
    const { confirmedContents } = ctx.request.body;

    const collectService = strapi.plugin('zhao-studio').service('collect');
    const result = await collectService.confirmImport(taskId, confirmedContents);

    ctx.body = { data: result };
  },

  async listTasks(ctx: any) {
    const tasks = await strapi
      .documents('plugin::zhao-studio.collect-task')
      .findMany();

    ctx.body = { data: tasks };
  },

  async getTask(ctx: any) {
    const { id } = ctx.params;

    const task = await strapi
      .documents('plugin::zhao-studio.collect-task')
      .findOne({ documentId: id });

    ctx.body = { data: task };
  },
});