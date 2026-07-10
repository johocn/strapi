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

    adminRoute('GET', '/sources', 'collect.listSources', 'zhao-studio.read'),
    adminRoute('POST', '/sources', 'collect.createSource', 'zhao-studio.create'),
    adminRoute('PUT', '/sources/:id', 'collect.updateSource', 'zhao-studio.update'),
    adminRoute('DELETE', '/sources/:id', 'collect.deleteSource', 'zhao-studio.delete'),

    adminRoute('POST', '/tasks', 'collect.createTask', 'zhao-studio.create'),
    adminRoute('GET', '/tasks', 'collect.listTasks', 'zhao-studio.read'),
    adminRoute('GET', '/tasks/:id', 'collect.getTask', 'zhao-studio.read'),
    adminRoute('POST', '/tasks/:taskId/content', 'collect.fetchSelectedContent', 'zhao-studio.create'),
    adminRoute('POST', '/tasks/:taskId/confirm', 'collect.confirmImport', 'zhao-studio.create'),

    adminRoute('GET', '/platforms', 'publish.listPlatforms', 'zhao-studio.read'),
    adminRoute('POST', '/platforms', 'publish.createPlatform', 'zhao-studio.create'),
    adminRoute('PUT', '/platforms/:id', 'publish.updatePlatform', 'zhao-studio.update'),
    adminRoute('DELETE', '/platforms/:id', 'publish.deletePlatform', 'zhao-studio.delete'),

    adminRoute('GET', '/accounts', 'publish.listAccounts', 'zhao-studio.read'),
    adminRoute('POST', '/accounts', 'publish.createAccount', 'zhao-studio.create'),
    adminRoute('PUT', '/accounts/:id', 'publish.updateAccount', 'zhao-studio.update'),
    adminRoute('DELETE', '/accounts/:id', 'publish.deleteAccount', 'zhao-studio.delete'),

    adminRoute('POST', '/articles/:articleId/publish', 'publish.publishArticle', 'zhao-studio.create'),
    adminRoute('GET', '/records', 'publish.listRecords', 'zhao-studio.read'),
    adminRoute('POST', '/records/:recordId/retry', 'publish.retryPublish', 'zhao-studio.update'),
    adminRoute('POST', '/articles/:articleId/sync', 'publish.syncStatus', 'zhao-studio.update'),

    adminRoute('GET', '/ai/config', 'ai.getConfig', 'zhao-studio.read'),
    adminRoute('POST', '/ai/config', 'ai.updateConfig', 'zhao-studio.update'),
    adminRoute('POST', '/ai/test', 'ai.testConnection', 'zhao-studio.update'),

    adminRoute('POST', '/ai/articles/:articleId/summary', 'ai.generateSummary', 'zhao-studio.update'),
    adminRoute('POST', '/ai/articles/:articleId/title', 'ai.optimizeTitle', 'zhao-studio.update'),
    adminRoute('POST', '/ai/articles/:articleId/rewrite', 'ai.rewriteContent', 'zhao-studio.update'),
    adminRoute('POST', '/ai/articles/:articleId/convert', 'ai.convertLanguage', 'zhao-studio.update'),

    adminRoute('POST', '/ai/chat', 'ai.chat', 'zhao-studio.read'),

    adminRoute('GET', '/ad-slots', 'analytics.listAdSlots', 'zhao-studio.read'),
    adminRoute('POST', '/ad-slots', 'analytics.createAdSlot', 'zhao-studio.create'),
    adminRoute('PUT', '/ad-slots/:id', 'analytics.updateAdSlot', 'zhao-studio.update'),
    adminRoute('DELETE', '/ad-slots/:id', 'analytics.deleteAdSlot', 'zhao-studio.delete'),

    adminRoute('GET', '/stats/overview', 'analytics.getOverview', 'zhao-studio.read'),
    adminRoute('GET', '/stats/articles', 'analytics.getArticleStats', 'zhao-studio.read'),
    adminRoute('GET', '/stats/ad-slots', 'analytics.getAdSlotStats', 'zhao-studio.read'),
    adminRoute('GET', '/stats/devices', 'analytics.getDeviceStats', 'zhao-studio.read'),
    adminRoute('GET', '/stats/regions', 'analytics.getRegionStats', 'zhao-studio.read'),
    adminRoute('GET', '/stats/users', 'analytics.getUserStats', 'zhao-studio.read'),

    // 草稿文章 admin CRUD
    adminRoute('GET', '/articles', 'draft.list', 'zhao-studio.read'),
    adminRoute('GET', '/articles/:id', 'draft.findOne', 'zhao-studio.read'),
    adminRoute('POST', '/articles', 'draft.create', 'zhao-studio.create'),
    adminRoute('PUT', '/articles/:id', 'draft.update', 'zhao-studio.update'),
    adminRoute('DELETE', '/articles/:id', 'draft.delete', 'zhao-studio.delete'),

    // knowledge-index CRUD
    adminRoute('GET', '/knowledge-indices', 'knowledge-index.list', 'zhao-studio.read'),
    adminRoute('GET', '/knowledge-indices/:id', 'knowledge-index.findOne', 'zhao-studio.read'),
    adminRoute('POST', '/knowledge-indices', 'knowledge-index.create', 'zhao-studio.create'),
    adminRoute('PUT', '/knowledge-indices/:id', 'knowledge-index.update', 'zhao-studio.update'),
    adminRoute('DELETE', '/knowledge-indices/:id', 'knowledge-index.delete', 'zhao-studio.delete'),

    // browser-log 查询
    adminRoute('GET', '/browser-logs', 'browser-log.list', 'zhao-studio.read'),
    adminRoute('GET', '/browser-logs/:id', 'browser-log.findOne', 'zhao-studio.read'),

    // stat-summary 查询
    adminRoute('GET', '/stat-summaries', 'stat-summary.list', 'zhao-studio.read'),
    adminRoute('GET', '/stat-summaries/:id', 'stat-summary.findOne', 'zhao-studio.read'),

    // 详情查询补全
    adminRoute('GET', '/sources/:id', 'collect.findOne', 'zhao-studio.read'),
    adminRoute('GET', '/records/:id', 'publish.findOne', 'zhao-studio.read'),
    adminRoute('GET', '/platforms/:id', 'publish.findOnePlatform', 'zhao-studio.read'),
    adminRoute('GET', '/accounts/:id', 'publish.findOneAccount', 'zhao-studio.read'),
    adminRoute('GET', '/ad-slots/:id', 'analytics.findOneAdSlot', 'zhao-studio.read'),
  ],
});
