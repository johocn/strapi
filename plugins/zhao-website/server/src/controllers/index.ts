import article from "./content-api/article";
import product from "./content-api/product";
import casE from "./content-api/case";
import faq from "./content-api/faq";
import tutorial from "./content-api/tutorial";
import compliance from "./content-api/compliance";
import download from "./content-api/download";
import lead from "./content-api/lead";
import seoOutput from "./content-api/seo-output";
import siteInfo from "./content-api/site-info";

import adminArticle from "./admin-api/article";
import adminSeoConfig from "./admin-api/seo-config";
import adminBrandInfo from "./admin-api/brand-info";
import generic from "./admin-api/generic";
import knowledgeGraph from "./admin-api/knowledge-graph";
import firstTruth from "./admin-api/first-truth";
import aiContentSummary from "./admin-api/ai-content-summary";
import studioBridge from "./admin-api/studio-bridge";
import stats from "./admin-api/stats";

const adminGeneric = Object.fromEntries(
  Object.entries(generic).map(([key, value]) => [`${key}-admin`, value])
);

export default {
  article,
  product,
  case: casE,
  faq,
  tutorial,
  compliance,
  download,
  lead,
  "seo-output": seoOutput,
  "site-info": siteInfo,
  "article-admin": adminArticle,
  "seo-config-admin": adminSeoConfig,
  "brand-info-admin": adminBrandInfo,
  ...adminGeneric,
  "knowledge-graph": knowledgeGraph,
  "first-truth": firstTruth,
  "ai-content-summary": aiContentSummary,
  "studio-bridge": studioBridge,
  stats,
};
