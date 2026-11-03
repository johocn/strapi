import { sendError } from "../../utils/errors";

const CONFIG_UID = "plugin::zhao-tire.tire-config";
const FAQ_UID = "plugin::zhao-tire.tire-faq";

export default {
  async agreement(ctx: any) {
    try {
      const config: any =
        (await strapi.documents(CONFIG_UID).findFirst({})) || {};
      ctx.body = { agreementText: config.agreementText || "" };
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async faqs(ctx: any) {
    try {
      const faqs = await strapi.db.query(FAQ_UID).findMany({
        where: { enabled: true },
        orderBy: { sort: "ASC" },
      });
      ctx.body = { faqs };
    } catch (error) {
      sendError(ctx, error);
    }
  },
};
