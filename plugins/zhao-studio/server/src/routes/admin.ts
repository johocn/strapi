// server/src/routes/admin.ts

export default {
  routes: [
    // 采集源管理（保持原有）
    {
      method: 'GET',
      path: '/v1/sources',
      handler: 'collect.listSources',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.read'] },
      },
    },
    {
      method: 'POST',
      path: '/v1/sources',
      handler: 'collect.createSource',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.create'] },
      },
    },
    {
      method: 'PUT',
      path: '/v1/sources/:id',
      handler: 'collect.updateSource',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.update'] },
      },
    },
    {
      method: 'DELETE',
      path: '/v1/sources/:id',
      handler: 'collect.deleteSource',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.delete'] },
      },
    },

    // 采集任务管理（保持原有）
    {
      method: 'POST',
      path: '/v1/tasks',
      handler: 'collect.createTask',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.create'] },
      },
    },
    {
      method: 'GET',
      path: '/v1/tasks',
      handler: 'collect.listTasks',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.read'] },
      },
    },
    {
      method: 'GET',
      path: '/v1/tasks/:id',
      handler: 'collect.getTask',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.read'] },
      },
    },
    {
      method: 'POST',
      path: '/v1/tasks/:taskId/content',
      handler: 'collect.fetchSelectedContent',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.create'] },
      },
    },
    {
      method: 'POST',
      path: '/v1/tasks/:taskId/confirm',
      handler: 'collect.confirmImport',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.create'] },
      },
    },

    // 发布平台管理（新增）
    {
      method: 'GET',
      path: '/v1/platforms',
      handler: 'publish.listPlatforms',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.read'] },
      },
    },
    {
      method: 'POST',
      path: '/v1/platforms',
      handler: 'publish.createPlatform',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.create'] },
      },
    },
    {
      method: 'PUT',
      path: '/v1/platforms/:id',
      handler: 'publish.updatePlatform',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.update'] },
      },
    },
    {
      method: 'DELETE',
      path: '/v1/platforms/:id',
      handler: 'publish.deletePlatform',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.delete'] },
      },
    },

    // 发布账号管理（新增）
    {
      method: 'GET',
      path: '/v1/accounts',
      handler: 'publish.listAccounts',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.read'] },
      },
    },
    {
      method: 'POST',
      path: '/v1/accounts',
      handler: 'publish.createAccount',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.create'] },
      },
    },
    {
      method: 'PUT',
      path: '/v1/accounts/:id',
      handler: 'publish.updateAccount',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.update'] },
      },
    },
    {
      method: 'DELETE',
      path: '/v1/accounts/:id',
      handler: 'publish.deleteAccount',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.delete'] },
      },
    },

    // 发布操作（新增）
    {
      method: 'POST',
      path: '/v1/articles/:articleId/publish',
      handler: 'publish.publishArticle',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.create'] },
      },
    },
    {
      method: 'GET',
      path: '/v1/records',
      handler: 'publish.listRecords',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.read'] },
      },
    },
    {
      method: 'POST',
      path: '/v1/records/:recordId/retry',
      handler: 'publish.retryPublish',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.update'] },
      },
    },
    {
      method: 'POST',
      path: '/v1/articles/:articleId/sync',
      handler: 'publish.syncStatus',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.update'] },
      },
    },

    // AI配置管理（保持原有）
    {
      method: 'GET',
      path: '/v1/ai/config',
      handler: 'ai.getConfig',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.read'] },
      },
    },
    {
      method: 'POST',
      path: '/v1/ai/config',
      handler: 'ai.updateConfig',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.update'] },
      },
    },
    {
      method: 'POST',
      path: '/v1/ai/test',
      handler: 'ai.testConnection',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.update'] },
      },
    },

    // AI操作（保持原有）
    {
      method: 'POST',
      path: '/v1/ai/articles/:articleId/summary',
      handler: 'ai.generateSummary',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.update'] },
      },
    },
    {
      method: 'POST',
      path: '/v1/ai/articles/:articleId/title',
      handler: 'ai.optimizeTitle',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.update'] },
      },
    },
    {
      method: 'POST',
      path: '/v1/ai/articles/:articleId/rewrite',
      handler: 'ai.rewriteContent',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.update'] },
      },
    },
    {
      method: 'POST',
      path: '/v1/ai/articles/:articleId/convert',
      handler: 'ai.convertLanguage',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.update'] },
      },
    },

    // 广告位管理（新增）
    {
      method: 'GET',
      path: '/v1/ad-slots',
      handler: 'analytics.listAdSlots',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.read'] },
      },
    },
    {
      method: 'POST',
      path: '/v1/ad-slots',
      handler: 'analytics.createAdSlot',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.create'] },
      },
    },
    {
      method: 'PUT',
      path: '/v1/ad-slots/:id',
      handler: 'analytics.updateAdSlot',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.update'] },
      },
    },
    {
      method: 'DELETE',
      path: '/v1/ad-slots/:id',
      handler: 'analytics.deleteAdSlot',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.delete'] },
      },
    },

    // 统计查询（新增）
    {
      method: 'GET',
      path: '/v1/stats/overview',
      handler: 'analytics.getOverview',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.read'] },
      },
    },
    {
      method: 'GET',
      path: '/v1/stats/articles',
      handler: 'analytics.getArticleStats',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.read'] },
      },
    },
    {
      method: 'GET',
      path: '/v1/stats/ad-slots',
      handler: 'analytics.getAdSlotStats',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.read'] },
      },
    },
    {
      method: 'GET',
      path: '/v1/stats/devices',
      handler: 'analytics.getDeviceStats',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.read'] },
      },
    },
    {
      method: 'GET',
      path: '/v1/stats/regions',
      handler: 'analytics.getRegionStats',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.read'] },
      },
    },
    {
      method: 'GET',
      path: '/v1/stats/users',
      handler: 'analytics.getUserStats',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.read'] },
      },
    },
  ],
};