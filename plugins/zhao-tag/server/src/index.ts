import type { Core } from "@strapi/strapi";
import contentTypes from "./content-types";
import controllers from "./controllers";
import services from "./services";
import routes from "./routes";

const SEED_GROUPS: { slug: string; name: string }[] = [
  { slug: "activity-category", name: "活动分类" },
  { slug: "activity-venue", name: "活动场地" },
  { slug: "activity-lecturer", name: "活动讲师" },
  { slug: "activity-series", name: "活动系列" },
];

export default {
  register() {},
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const UID = "plugin::zhao-tag.tag-group";
    for (const g of SEED_GROUPS) {
      try {
        const exists = await strapi.documents(UID).findMany({
          filters: { slug: g.slug },
          fields: ["documentId"],
        });
        if (exists?.length) continue;
        await strapi.documents(UID).create({ data: g });
      } catch (e: any) {
        strapi.log.warn(`[zhao-tag] 种子分组 ${g.slug} 失败: ${e.message}`);
      }
    }
  },
  destroy() {},
  contentTypes,
  controllers,
  services,
  routes,
};
