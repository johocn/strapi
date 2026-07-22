type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const publicRoute = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: { auth: false },
});

const adminRoute = (method: Method, path: string, handler: string, permission: string) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      'plugin::zhao-auth.is-authenticated',
      { name: 'plugin::zhao-auth.has-permission', config: { action: permission } },
      'plugin::zhao-auth.has-channel-scope',
      'plugin::zhao-auth.has-tenant-access',
    ],
  },
});

export default () => ({
  type: 'content-api' as const,
  routes: [
    publicRoute('GET', '/articles', 'internal-api.listArticles'),
    publicRoute('GET', '/articles/:id', 'internal-api.getArticle'),
    publicRoute('GET', '/articles/search', 'internal-api.searchArticles'),
    publicRoute('GET', '/categories', 'internal-api.getCategories'),
    publicRoute('GET', '/channels', 'internal-api.getChannels'),
    publicRoute('POST', '/analytics/page-view', 'analytics.trackPageView'),
    publicRoute('POST', '/analytics/ad-click', 'analytics.trackAdClick'),
    publicRoute('POST', '/analytics/read-behavior', 'analytics.trackReadBehavior'),
    publicRoute('POST', '/analytics/user-register', 'analytics.trackUserRegister'),

    adminRoute('GET', '/sources', 'collect.listSources', 'zhao-studio.collect-source.manage'),
    adminRoute('POST', '/sources', 'collect.createSource', 'zhao-studio.collect-source.manage'),
    adminRoute('PUT', '/sources/:id', 'collect.updateSource', 'zhao-studio.collect-source.manage'),
    adminRoute('DELETE', '/sources/:id', 'collect.deleteSource', 'zhao-studio.collect-source.manage'),

    adminRoute('POST', '/tasks', 'collect.createTask', 'zhao-studio.collect-task.manage'),
    adminRoute('GET', '/tasks', 'collect.listTasks', 'zhao-studio.collect-task.manage'),
    adminRoute('GET', '/tasks/:id', 'collect.getTask', 'zhao-studio.collect-task.manage'),
    adminRoute('POST', '/tasks/:taskId/content', 'collect.fetchSelectedContent', 'zhao-studio.collect-task.manage'),
    adminRoute('POST', '/tasks/:taskId/confirm', 'collect.confirmImport', 'zhao-studio.collect-task.manage'),

    adminRoute('GET', '/platforms', 'publish.listPlatforms', 'zhao-studio.publish-platform.manage'),
    adminRoute('POST', '/platforms', 'publish.createPlatform', 'zhao-studio.publish-platform.manage'),
    adminRoute('PUT', '/platforms/:id', 'publish.updatePlatform', 'zhao-studio.publish-platform.manage'),
    adminRoute('DELETE', '/platforms/:id', 'publish.deletePlatform', 'zhao-studio.publish-platform.manage'),

    adminRoute('GET', '/accounts', 'publish.listAccounts', 'zhao-studio.publish-account.manage'),
    adminRoute('POST', '/accounts', 'publish.createAccount', 'zhao-studio.publish-account.manage'),
    adminRoute('PUT', '/accounts/:id', 'publish.updateAccount', 'zhao-studio.publish-account.manage'),
    adminRoute('DELETE', '/accounts/:id', 'publish.deleteAccount', 'zhao-studio.publish-account.manage'),

    adminRoute('POST', '/articles/:articleId/publish', 'publish.publishArticle', 'zhao-studio.publish.publish'),
    adminRoute('GET', '/records', 'publish.listRecords', 'zhao-studio.publish-record.manage'),
    adminRoute('POST', '/records/:recordId/retry', 'publish.retryPublish', 'zhao-studio.publish-record.manage'),
    adminRoute('POST', '/articles/:articleId/sync', 'publish.syncStatus', 'zhao-studio.publish-record.manage'),

    adminRoute('GET', '/ai/config', 'ai.getConfig', 'zhao-studio.ai.manage'),
    adminRoute('POST', '/ai/config', 'ai.updateConfig', 'zhao-studio.ai.manage'),
    adminRoute('POST', '/ai/test', 'ai.testConnection', 'zhao-studio.ai.manage'),

    adminRoute('POST', '/ai/articles/:articleId/summary', 'ai.generateSummary', 'zhao-studio.ai.manage'),
    adminRoute('POST', '/ai/articles/:articleId/title', 'ai.optimizeTitle', 'zhao-studio.ai.manage'),
    adminRoute('POST', '/ai/articles/:articleId/rewrite', 'ai.rewriteContent', 'zhao-studio.ai.manage'),
    adminRoute('POST', '/ai/articles/:articleId/convert', 'ai.convertLanguage', 'zhao-studio.ai.manage'),

    adminRoute('POST', '/ai/chat', 'ai.chat', 'zhao-studio.ai.manage'),

    adminRoute('GET', '/ad-slots', 'analytics.listAdSlots', 'zhao-studio.ad-slot.manage'),
    adminRoute('POST', '/ad-slots', 'analytics.createAdSlot', 'zhao-studio.ad-slot.manage'),
    adminRoute('PUT', '/ad-slots/:id', 'analytics.updateAdSlot', 'zhao-studio.ad-slot.manage'),
    adminRoute('DELETE', '/ad-slots/:id', 'analytics.deleteAdSlot', 'zhao-studio.ad-slot.manage'),

    adminRoute('GET', '/stats/overview', 'analytics.getOverview', 'zhao-studio.stat-summary.view'),
    adminRoute('GET', '/stats/articles', 'analytics.getArticleStats', 'zhao-studio.stat-summary.view'),
    adminRoute('GET', '/stats/ad-slots', 'analytics.getAdSlotStats', 'zhao-studio.stat-summary.view'),
    adminRoute('GET', '/stats/devices', 'analytics.getDeviceStats', 'zhao-studio.stat-summary.view'),
    adminRoute('GET', '/stats/regions', 'analytics.getRegionStats', 'zhao-studio.stat-summary.view'),
    adminRoute('GET', '/stats/users', 'analytics.getUserStats', 'zhao-studio.stat-summary.view'),

    // 草稿文章 admin CRUD
    adminRoute('GET', '/articles', 'draft.list', 'zhao-studio.article-draft.manage'),
    adminRoute('GET', '/articles/:id', 'draft.findOne', 'zhao-studio.article-draft.manage'),
    adminRoute('POST', '/articles', 'draft.create', 'zhao-studio.article-draft.manage'),
    adminRoute('PUT', '/articles/:id', 'draft.update', 'zhao-studio.article-draft.manage'),
    adminRoute('DELETE', '/articles/:id', 'draft.delete', 'zhao-studio.article-draft.manage'),

    // knowledge-index CRUD
    adminRoute('GET', '/knowledge-indices', 'knowledge-index.list', 'zhao-studio.knowledge-index.manage'),
    adminRoute('GET', '/knowledge-indices/:id', 'knowledge-index.findOne', 'zhao-studio.knowledge-index.manage'),
    adminRoute('POST', '/knowledge-indices', 'knowledge-index.create', 'zhao-studio.knowledge-index.manage'),
    adminRoute('PUT', '/knowledge-indices/:id', 'knowledge-index.update', 'zhao-studio.knowledge-index.manage'),
    adminRoute('DELETE', '/knowledge-indices/:id', 'knowledge-index.delete', 'zhao-studio.knowledge-index.manage'),

    // browser-log 查询
    adminRoute('GET', '/browser-logs', 'browser-log.list', 'zhao-studio.browser-log.view'),
    adminRoute('GET', '/browser-logs/:id', 'browser-log.findOne', 'zhao-studio.browser-log.view'),

    // stat-summary 查询
    adminRoute('GET', '/stat-summaries', 'stat-summary.list', 'zhao-studio.stat-summary.view'),
    adminRoute('GET', '/stat-summaries/:id', 'stat-summary.findOne', 'zhao-studio.stat-summary.view'),

    // 详情查询补全
    adminRoute('GET', '/sources/:id', 'collect.findOne', 'zhao-studio.collect-source.manage'),
    adminRoute('GET', '/records/:id', 'publish.findOne', 'zhao-studio.publish-record.manage'),
    adminRoute('GET', '/platforms/:id', 'publish.findOnePlatform', 'zhao-studio.publish-platform.manage'),
    adminRoute('GET', '/accounts/:id', 'publish.findOneAccount', 'zhao-studio.publish-account.manage'),
    adminRoute('GET', '/ad-slots/:id', 'analytics.findOneAdSlot', 'zhao-studio.ad-slot.manage'),

    // 同步事件 admin 路由
    adminRoute('GET', '/sync-events', 'sync-event-api.list', 'zhao-studio.sync-event.manage'),
    adminRoute('GET', '/sync-events/:documentId', 'sync-event-api.findOne', 'zhao-studio.sync-event.manage'),
    adminRoute('POST', '/sync-events/:documentId/resolve', 'sync-event-api.resolve', 'zhao-studio.sync-event.resolve'),

    // webhook 公开路由（zhao-website → zhao-studio）
    publicRoute('POST', '/webhooks/sync-event', 'sync-event-api.createFromWebhook'),

    // ============ 推广渠道模块 ============
    adminRoute('GET', '/channels', 'promo-channel.list', 'zhao-studio.promo-channel.manage'),
    adminRoute('POST', '/channels', 'promo-channel.create', 'zhao-studio.promo-channel.manage'),
    adminRoute('GET', '/channels/:id', 'promo-channel.findOne', 'zhao-studio.promo-channel.manage'),
    adminRoute('PUT', '/channels/:id', 'promo-channel.update', 'zhao-studio.promo-channel.manage'),
    adminRoute('DELETE', '/channels/:id', 'promo-channel.delete', 'zhao-studio.promo-channel.manage'),

    adminRoute('GET', '/campaigns', 'promo-campaign.list', 'zhao-studio.promo-campaign.manage'),
    adminRoute('POST', '/campaigns', 'promo-campaign.create', 'zhao-studio.promo-campaign.manage'),
    adminRoute('GET', '/campaigns/:id', 'promo-campaign.findOne', 'zhao-studio.promo-campaign.manage'),
    adminRoute('PUT', '/campaigns/:id', 'promo-campaign.update', 'zhao-studio.promo-campaign.manage'),
    adminRoute('DELETE', '/campaigns/:id', 'promo-campaign.delete', 'zhao-studio.promo-campaign.manage'),

    adminRoute('GET', '/experiments', 'ab-test.list', 'zhao-studio.ab-experiment.manage'),
    adminRoute('POST', '/experiments', 'ab-test.create', 'zhao-studio.ab-experiment.manage'),
    adminRoute('GET', '/experiments/:id', 'ab-test.findOne', 'zhao-studio.ab-experiment.manage'),
    adminRoute('PUT', '/experiments/:id/start', 'ab-test.start', 'zhao-studio.ab-experiment.start'),
    adminRoute('PUT', '/experiments/:id/stop', 'ab-test.stop', 'zhao-studio.ab-experiment.stop'),
    adminRoute('GET', '/experiments/:id/report', 'ab-test.report', 'zhao-studio.ab-experiment.manage'),

    adminRoute('GET', '/channel-report', 'channel-report.getChannelReport', 'zhao-studio.channel-report.view'),

    // 公开路由：A/B 变体选择
    publicRoute('GET', '/variants/pick', 'ab-test.pickVariant'),
  ],
});