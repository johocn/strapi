import type { Core } from "@strapi/strapi";

const destroy = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("[zhao-third] 三方登录插件已销毁");
};

export default destroy;
