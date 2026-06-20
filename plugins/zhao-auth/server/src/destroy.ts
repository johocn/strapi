import type { Core } from "@strapi/strapi";

const destroy = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("zhao-auth plugin destroyed");
};

export default destroy;
