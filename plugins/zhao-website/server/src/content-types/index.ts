import seoConfig from "./seo-config/schema.json";
import brandInfo from "./brand-info/schema.json";
import article from "./article/schema.json";
import articleCategory from "./article-category/schema.json";
import product from "./product/schema.json";
import caseCt from "./case/schema.json";
import compliance from "./compliance/schema.json";
import faq from "./faq/schema.json";
import tutorial from "./tutorial/schema.json";
import download from "./download/schema.json";
import lead from "./lead/schema.json";
import visitLog from "./visit-log/schema.json";
import interaction from "./interaction/schema.json";
import searchLog from "./search-log/schema.json";
import knowledgeEntity from "./knowledge-entity/schema.json";
import knowledgeRelation from "./knowledge-relation/schema.json";
import aiContentSummary from "./ai-content-summary/schema.json";
import firstTruthPolicy from "./first-truth-policy/schema.json";
import brandVoice from "./brand-voice/schema.json";

export default {
  "seo-config": { schema: seoConfig },
  "brand-info": { schema: brandInfo },
  "article": { schema: article },
  "article-category": { schema: articleCategory },
  "product": { schema: product },
  "case": { schema: caseCt },
  "compliance": { schema: compliance },
  "faq": { schema: faq },
  "tutorial": { schema: tutorial },
  "download": { schema: download },
  "lead": { schema: lead },
  "visit-log": { schema: visitLog },
  "interaction": { schema: interaction },
  "search-log": { schema: searchLog },
  "knowledge-entity": { schema: knowledgeEntity },
  "knowledge-relation": { schema: knowledgeRelation },
  "ai-content-summary": { schema: aiContentSummary },
  "first-truth-policy": { schema: firstTruthPolicy },
  "brand-voice": { schema: brandVoice },
};
