import type { Core } from "@strapi/strapi";
import { AdapterRegistry } from "./adapters/adapter-registry";
import { TaobaoAdapter } from "./adapters/taobao-adapter";
import { PddAdapter } from "./adapters/pdd-adapter";
import { DouyinAdapter } from "./adapters/douyin-adapter";
import { JdAdapter } from "./adapters/jd-adapter";
import { MockAdapter } from "./adapters/adapter-mock";

const PLATFORM_UID = "plugin::zhao-deal.platform";

let registryInstance: AdapterRegistry | null = null;

export async function initRegistry(strapi: Core.Strapi): Promise<AdapterRegistry> {
  const registry = new AdapterRegistry();
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
  if (strapi.config.get("environment") === "development") {
    registry.register(new MockAdapter());
  }
  registryInstance = registry;
  return registry;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  if (!registryInstance) {
    registryInstance = new AdapterRegistry();
  }
  return registryInstance;
};
