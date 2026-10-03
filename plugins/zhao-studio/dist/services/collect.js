"use strict";
// server/src/services/collect.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    async createTask(sourceId) {
        const scraper = strapi.plugin('zhao-studio').service('scraper');
        // 1. 抓取标题列表
        const titles = await scraper.fetchTitles(sourceId);
        // 2. 创建采集任务
        const task = await strapi
            .documents('plugin::zhao-studio.collect-task')
            .create({
            data: {
                source: sourceId,
                titles,
                status: 'waiting_selection',
            },
        });
        // 3. 更新采集源的最后采集时间
        await strapi
            .documents('plugin::zhao-studio.collect-source')
            .update({
            documentId: sourceId,
            data: {
                lastCollectedAt: new Date(),
            },
        });
        return task;
    },
    async fetchSelectedContent(taskId, selectedTitles) {
        const task = await strapi
            .documents('plugin::zhao-studio.collect-task')
            .findOne({ documentId: taskId });
        if (!task) {
            throw new Error('采集任务不存在');
        }
        // 1. 更新任务状态
        await strapi
            .documents('plugin::zhao-studio.collect-task')
            .update({
            documentId: taskId,
            data: {
                status: 'fetching_content',
            },
        });
        // 2. 抓取选中文章的完整内容
        const scraper = strapi.plugin('zhao-studio').service('scraper');
        const qualityService = strapi.plugin('zhao-studio').service('quality');
        const contents = [];
        for (const titleUrl of selectedTitles) {
            try {
                const content = await scraper.fetchContent(titleUrl, task.source.documentId);
                const qualityScore = qualityService.calculateQuality(content);
                contents.push({
                    title: content.title,
                    content: content.body,
                    sourceUrl: titleUrl,
                    sourceAuthor: content.author,
                    sourcePublishedAt: content.date,
                    images: content.images,
                    qualityScore,
                });
            }
            catch (error) {
                // 记录错误但继续处理其他文章
                contents.push({
                    title: '',
                    content: '',
                    sourceUrl: titleUrl,
                    error: error.message,
                    qualityScore: { total: 0, details: {} },
                });
            }
        }
        // 3. 存入临时状态
        await strapi
            .documents('plugin::zhao-studio.collect-task')
            .update({
            documentId: taskId,
            data: {
                selectedTitles: contents,
                status: 'completed',
            },
        });
        return contents;
    },
    async confirmImport(taskId, confirmedContents) {
        const task = await strapi
            .documents('plugin::zhao-studio.collect-task')
            .findOne({ documentId: taskId });
        if (!task) {
            throw new Error('采集任务不存在');
        }
        const qualityService = strapi.plugin('zhao-studio').service('quality');
        // 1. 创建草稿文章
        const importedArticles = [];
        for (const content of confirmedContents) {
            if (content.error) {
                continue; // 跳过错误内容
            }
            const isAcceptable = qualityService.isQualityAcceptable(content.qualityScore);
            if (!isAcceptable) {
                continue; // 跳过低质量内容
            }
            const article = await strapi
                .documents('plugin::zhao-studio.article-draft')
                .create({
                data: {
                    title: content.title,
                    content: content.content,
                    sourceUrl: content.sourceUrl,
                    sourceAuthor: content.sourceAuthor,
                    sourcePublishedAt: content.sourcePublishedAt,
                    status: 'draft',
                    category: '',
                    aiProcessed: false,
                },
            });
            importedArticles.push(article);
        }
        // 2. 更新任务状态
        await strapi
            .documents('plugin::zhao-studio.collect-task')
            .update({
            documentId: taskId,
            data: {
                status: 'completed',
            },
        });
        return { imported: importedArticles.length, articles: importedArticles };
    },
});
//# sourceMappingURL=collect.js.map