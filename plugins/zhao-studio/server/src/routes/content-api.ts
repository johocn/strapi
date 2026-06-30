// server/src/routes/content-api.ts

export default {
  routes: [
    // 文章列表（C端访问）
    {
      method: 'GET',
      path: '/v1/articles',
      handler: 'internal-api.listArticles',
      config: { auth: false },
    },

    // 文章详情（C端访问）
    {
      method: 'GET',
      path: '/v1/articles/:id',
      handler: 'internal-api.getArticle',
      config: { auth: false },
    },

    // 文章搜索（C端访问）
    {
      method: 'GET',
      path: '/v1/articles/search',
      handler: 'internal-api.searchArticles',
      config: { auth: false },
    },

    // 分类列表（C端访问）
    {
      method: 'GET',
      path: '/v1/categories',
      handler: 'internal-api.getCategories',
      config: { auth: false },
    },

    // 渠道列表（C端访问）
    {
      method: 'GET',
      path: '/v1/channels',
      handler: 'internal-api.getChannels',
      config: { auth: false },
    },

    // 统计上报接口（公开访问）
    {
      method: 'POST',
      path: '/v1/analytics/page-view',
      handler: 'analytics.trackPageView',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/v1/analytics/ad-click',
      handler: 'analytics.trackAdClick',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/v1/analytics/read-behavior',
      handler: 'analytics.trackReadBehavior',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/v1/analytics/user-register',
      handler: 'analytics.trackUserRegister',
      config: { auth: false },
    },
  ],
};