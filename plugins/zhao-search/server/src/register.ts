import type { Core } from "@strapi/strapi";

const register = (_: { strapi: Core.Strapi }) => {
  // 空注册：无权限 action、无跨插件依赖
};
export default register;
