import type { Core } from "@strapi/strapi";
const register = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("[zhao-website] register");
};
export default register;
