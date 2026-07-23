import type { Core } from "@strapi/strapi";
import { initRegistry } from "./services/adapter-registry-service";

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("[zhao-deal] 插件已加载");
  try {
    await initRegistry(strapi);
  } catch (err: any) {
    strapi.log.warn(`[zhao-deal] 平台加载失败: ${err.message}`);
  }
};
