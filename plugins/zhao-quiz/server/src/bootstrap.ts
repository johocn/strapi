import type { Core } from "@strapi/strapi";

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("zhao-quiz: 插件已加载");
};

export default bootstrap;
