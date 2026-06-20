import type { Core } from "@strapi/strapi";
import policies from "./policies";

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  // 服务通过 services/index.ts 自动注册，无需手动实例化

  // 注册策略到 Strapi 策略注册表
  const policyRegistry = strapi.get("policies");
  policyRegistry.add("plugin::zhao-auth", policies);

  strapi.log.info("[zhao-auth] 策略已注册");
};

export default register;
