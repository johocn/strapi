"use strict";
// server/src/controllers/collect.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    async listSources(ctx) {
        const sources = await strapi
            .documents('plugin::zhao-studio.collect-source')
            .findMany();
        ctx.body = { data: sources };
    },
    async createSource(ctx) {
        const { data } = ctx.request.body;
        const source = await strapi
            .documents('plugin::zhao-studio.collect-source')
            .create({ data });
        ctx.body = { data: source };
    },
    async updateSource(ctx) {
        const { id } = ctx.params;
        const { data } = ctx.request.body;
        const source = await strapi
            .documents('plugin::zhao-studio.collect-source')
            .update({ documentId: id, data });
        ctx.body = { data: source };
    },
    async deleteSource(ctx) {
        const { id } = ctx.params;
        const source = await strapi
            .documents('plugin::zhao-studio.collect-source')
            .delete({ documentId: id });
        ctx.body = { data: source };
    },
    async createTask(ctx) {
        const { sourceId } = ctx.request.body;
        const collectService = strapi.plugin('zhao-studio').service('collect');
        const task = await collectService.createTask(sourceId);
        ctx.body = { data: task };
    },
    async fetchSelectedContent(ctx) {
        const { taskId } = ctx.params;
        const { selectedTitles } = ctx.request.body;
        const collectService = strapi.plugin('zhao-studio').service('collect');
        const contents = await collectService.fetchSelectedContent(taskId, selectedTitles);
        ctx.body = { data: contents };
    },
    async confirmImport(ctx) {
        const { taskId } = ctx.params;
        const { confirmedContents } = ctx.request.body;
        const collectService = strapi.plugin('zhao-studio').service('collect');
        const result = await collectService.confirmImport(taskId, confirmedContents);
        ctx.body = { data: result };
    },
    async listTasks(ctx) {
        const tasks = await strapi
            .documents('plugin::zhao-studio.collect-task')
            .findMany();
        ctx.body = { data: tasks };
    },
    async getTask(ctx) {
        const { id } = ctx.params;
        const task = await strapi
            .documents('plugin::zhao-studio.collect-task')
            .findOne({ documentId: id });
        ctx.body = { data: task };
    },
    async findOne(ctx) {
        const { id } = ctx.params;
        const source = await strapi
            .documents('plugin::zhao-studio.collect-source')
            .findOne({ documentId: id });
        ctx.body = { data: source };
    },
});
//# sourceMappingURL=collect.js.map