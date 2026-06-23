import type { Core } from "@strapi/strapi";

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("[zhao-third] 三方登录插件已注册");
};

export default register;
