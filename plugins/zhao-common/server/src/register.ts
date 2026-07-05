import type { Core } from "@strapi/strapi";
import policies from "./policies";

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  // 注册阶段：插件配置验证等

  // 注册策略到 Strapi 策略注册表
  const policyRegistry = strapi.get("policies");
  policyRegistry.add("plugin::zhao-common", policies);

  strapi.log.info("[zhao-common] 策略已注册");
};

export default register;