const ADMIN_BASE = '/api/zhao-website/admin';
const PUBLIC_BASE = '/api/zhao-website/v1';

export const API = {
  statsOverview: `${ADMIN_BASE}/stats/overview`,
  statsLead: (days = 30) => `${ADMIN_BASE}/stats/lead-stats?days=${days}`,
  statsSearch: (days = 30) => `${ADMIN_BASE}/stats/search-stats?days=${days}`,
  studioBridgePublish: `${ADMIN_BASE}/studio-bridge/publishFromStudio`,
  kgFindEntities: (params: Record<string, any> = {}) =>
    `${ADMIN_BASE}/knowledge-graph/find-entities?${new URLSearchParams(params).toString()}`,
  kgCreateEntity: `${ADMIN_BASE}/knowledge-graph/create-entity`,
  kgUpdateEntity: (id: string) => `${ADMIN_BASE}/knowledge-graph/update-entity/${id}`,
  kgDeleteEntity: (id: string) => `${ADMIN_BASE}/knowledge-graph/delete-entity/${id}`,
  kgFindRelations: (params: Record<string, any> = {}) =>
    `${ADMIN_BASE}/knowledge-graph/find-relations?${new URLSearchParams(params).toString()}`,
  kgAddRelation: `${ADMIN_BASE}/knowledge-graph/add-relation`,
  kgDeleteRelation: (id: string) => `${ADMIN_BASE}/knowledge-graph/delete-relation/${id}`,
  kgExportGraph: `${ADMIN_BASE}/knowledge-graph/export-graph`,
  ftFind: (params: Record<string, any> = {}) =>
    `${ADMIN_BASE}/first-truth/find?${new URLSearchParams(params).toString()}`,
  ftFindOne: (id: string) => `${ADMIN_BASE}/first-truth/find-one/${id}`,
  ftCreate: `${ADMIN_BASE}/first-truth/create`,
  ftUpdate: (id: string) => `${ADMIN_BASE}/first-truth/update/${id}`,
  ftDelete: (id: string) => `${ADMIN_BASE}/first-truth/delete/${id}`,
  ftVerify: (id: string) => `${ADMIN_BASE}/first-truth/verify/${id}`,
  ftConflicts: `${ADMIN_BASE}/first-truth/conflicts`,
  ftExportFacts: `${ADMIN_BASE}/first-truth/export-facts`,
  aiFindByTarget: (params: Record<string, any> = {}) =>
    `${ADMIN_BASE}/ai-content-summary/find-by-target?${new URLSearchParams(params).toString()}`,
  aiCreate: `${ADMIN_BASE}/ai-content-summary/create`,
  aiUpdate: (id: string) => `${ADMIN_BASE}/ai-content-summary/update/${id}`,
  aiDelete: (id: string) => `${ADMIN_BASE}/ai-content-summary/delete/${id}`,
  aiRegenerate: (id: string) => `${ADMIN_BASE}/ai-content-summary/regenerate/${id}`,
  seoSitemap: `${PUBLIC_BASE}/sitemap.xml`,
  seoRobots: `${PUBLIC_BASE}/robots.txt`,
  seoLlmsTxt: `${PUBLIC_BASE}/llms.txt`,
};
