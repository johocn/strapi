const ADMIN_BASE = '/api/zhao-website/v1/admin';
const PUBLIC_BASE = '/api/zhao-website/v1';

export const API = {
  statsOverview: `${ADMIN_BASE}/stats/overview`,
  statsLead: (days = 30) => `${ADMIN_BASE}/stats/leads?days=${days}`,
  statsSearch: (days = 30) => `${ADMIN_BASE}/stats/search?days=${days}`,
  studioBridgePublish: `${ADMIN_BASE}/studio-bridge/publish`,
  // 知识图谱
  kgFindEntities: (params: Record<string, any> = {}) =>
    `${ADMIN_BASE}/knowledge-graph/entities?${new URLSearchParams(params).toString()}`,
  kgCreateEntity: `${ADMIN_BASE}/knowledge-graph/entities`,
  kgUpdateEntity: (id: string) => `${ADMIN_BASE}/knowledge-graph/entities/${id}`,
  kgDeleteEntity: (id: string) => `${ADMIN_BASE}/knowledge-graph/entities/${id}`,
  kgFindRelations: (params: Record<string, any> = {}) =>
    `${ADMIN_BASE}/knowledge-graph/relations?${new URLSearchParams(params).toString()}`,
  kgAddRelation: `${ADMIN_BASE}/knowledge-graph/relations`,
  kgDeleteRelation: (id: string) => `${ADMIN_BASE}/knowledge-graph/relations/${id}`,
  kgDisambiguate: `${ADMIN_BASE}/knowledge-graph/disambiguate`,
  kgExportGraph: `${ADMIN_BASE}/knowledge-graph/export`,
  // 全局实体
  kgCreateGlobalEntity: `${ADMIN_BASE}/knowledge-graph/entities/global`,
  kgUpdateGlobalEntity: (id: string) => `${ADMIN_BASE}/knowledge-graph/entities/global/${id}`,
  kgDeleteGlobalEntity: (id: string) => `${ADMIN_BASE}/knowledge-graph/entities/global/${id}`,
  // 第一真值
  ftFind: (params: Record<string, any> = {}) =>
    `${ADMIN_BASE}/first-truths?${new URLSearchParams(params).toString()}`,
  ftFindOne: (id: string) => `${ADMIN_BASE}/first-truths/${id}`,
  ftCreate: `${ADMIN_BASE}/first-truths`,
  ftUpdate: (id: string) => `${ADMIN_BASE}/first-truths/${id}`,
  ftDelete: (id: string) => `${ADMIN_BASE}/first-truths/${id}`,
  ftVerify: (id: string) => `${ADMIN_BASE}/first-truths/${id}/verify`,
  ftConflicts: `${ADMIN_BASE}/first-truths/conflicts`,
  ftExportFacts: `${ADMIN_BASE}/first-truths/export`,
  // 全局真值
  ftCreateGlobal: `${ADMIN_BASE}/first-truths/global`,
  ftUpdateGlobal: (id: string) => `${ADMIN_BASE}/first-truths/global/${id}`,
  ftDeleteGlobal: (id: string) => `${ADMIN_BASE}/first-truths/global/${id}`,
  ftVerifyGlobal: (id: string) => `${ADMIN_BASE}/first-truths/global/${id}/verify`,
  // 品牌话术
  bvFind: (params: Record<string, any> = {}) =>
    `${ADMIN_BASE}/brand-voices?${new URLSearchParams(params).toString()}`,
  bvFindOne: (id: string) => `${ADMIN_BASE}/brand-voices/${id}`,
  bvCreate: `${ADMIN_BASE}/brand-voices`,
  bvUpdate: (id: string) => `${ADMIN_BASE}/brand-voices/${id}`,
  bvDelete: (id: string) => `${ADMIN_BASE}/brand-voices/${id}`,
  bvResolve: (id: string) => `${ADMIN_BASE}/brand-voices/${id}/resolve`,
  bvListByCategory: (category: string) => `${ADMIN_BASE}/brand-voices/by-category/${category}`,
  // 全局品牌话术
  bvCreateGlobal: `${ADMIN_BASE}/brand-voices/global`,
  bvUpdateGlobal: (id: string) => `${ADMIN_BASE}/brand-voices/global/${id}`,
  bvDeleteGlobal: (id: string) => `${ADMIN_BASE}/brand-voices/global/${id}`,
  // AI 摘要
  aiFindByTarget: (params: Record<string, any> = {}) =>
    `${ADMIN_BASE}/ai-summaries?${new URLSearchParams(params).toString()}`,
  aiCreate: `${ADMIN_BASE}/ai-summaries`,
  aiUpdate: (id: string) => `${ADMIN_BASE}/ai-summaries/${id}`,
  aiDelete: (id: string) => `${ADMIN_BASE}/ai-summaries/${id}`,
  aiRegenerate: (id: string) => `${ADMIN_BASE}/ai-summaries/${id}/regenerate`,
  // SEO 公开路由
  seoSitemap: `${PUBLIC_BASE}/sitemap.xml`,
  seoRobots: `${PUBLIC_BASE}/robots.txt`,
  seoLlmsTxt: `${PUBLIC_BASE}/llms.txt`,
};
