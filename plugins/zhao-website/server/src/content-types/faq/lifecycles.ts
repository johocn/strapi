import { syncTagIndex, removeTagIndex } from "../../services/utils/tag-sync";
import { knowledgeGraphSync } from "../../services/utils/kg-sync";

const TARGET_TYPE = "website-faq";
const PATH_PREFIX = "/faqs";

async function pushToSearchEngines(event: any) {
  try {
    const result = event.result;
    if (result.status !== "published") return;
    const siteConfig = await strapi.db.query("plugin::zhao-common.site-config").findOne({
      where: { id: result.site },
    });
    if (!siteConfig?.domain) return;
    const url = `${siteConfig.domain}${PATH_PREFIX}/${result.slug}`;
    await strapi.plugin("zhao-website").service("search-engine-push").pushAll(result.site, [url]);
    strapi.plugin("zhao-website").service("cache")?.invalidate();
  } catch (e) {
    strapi.log.warn("[zhao-website] faq search engine push failed:", e);
  }
}

export default {
  async afterCreate(event: any) {
    await syncTagIndex(event, TARGET_TYPE).catch(() => {});
    await knowledgeGraphSync(TARGET_TYPE, event.result).catch(() => {});
    await pushToSearchEngines(event);
  },
  async afterUpdate(event: any) {
    await syncTagIndex(event, TARGET_TYPE).catch(() => {});
    await knowledgeGraphSync(TARGET_TYPE, event.result).catch(() => {});
    await pushToSearchEngines(event);
  },
  async afterDelete(event: any) {
    await removeTagIndex(event, TARGET_TYPE).catch(() => {});
    strapi.plugin("zhao-website").service("cache")?.invalidate();
  },
};
