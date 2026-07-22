import type { Core } from "@strapi/strapi";
import { AdapterRegistry } from "./services/adapters/adapter-registry";
import { TaobaoAdapter } from "./services/adapters/taobao-adapter";
import { PddAdapter } from "./services/adapters/pdd-adapter";
import { DouyinAdapter } from "./services/adapters/douyin-adapter";
import { JdAdapter } from "./services/adapters/jd-adapter";
import { MockAdapter } from "./services/adapters/adapter-mock";

const PLATFORM_UID = "plugin::zhao-deal.platform";

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("[zhao-deal] 插件已加载");

  const registry = new AdapterRegistry();

  try {
    const platforms: any[] = await strapi.documents(PLATFORM_UID).findMany({});
    for (const platform of platforms) {
      if (!platform.syncEnabled) continue;
      const cfg = {
        appKey: platform.appKey || "",
        appSecret: platform.appSecret || "",
        apiEndpoint: platform.apiEndpoint || "",
      };
      switch (platform.code) {
        case "taobao": registry.register(new TaobaoAdapter(cfg)); break;
        case "pdd":    registry.register(new PddAdapter(cfg)); break;
        case "douyin": registry.register(new DouyinAdapter(cfg)); break;
        case "jd":     registry.register(new JdAdapter(cfg)); break;
      }
    }
  } catch (err: any) {
    strapi.log.warn(`[zhao-deal] 平台加载失败: ${err.message}`);
  }

  if (strapi.config.get("environment") === "development") {
    registry.register(new MockAdapter());
  }

  // 挂载到 strapi 上供跨插件访问
  (strapi as any).plugin("zhao-deal").service("adapterRegistry", registry);
};
