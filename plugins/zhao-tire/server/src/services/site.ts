import type { Core } from "@strapi/strapi";

const CONFIG_UID = "plugin::zhao-tire.tire-config";
const PACKAGE_UID = "plugin::zhao-tire.tire-package";
const ADDON_UID = "plugin::zhao-tire.tire-addon";
const FAQ_UID = "plugin::zhao-tire.tire-faq";
const REVIEW_UID = "plugin::zhao-tire.tire-review";
const GALLERY_UID = "plugin::zhao-tire.tire-gallery";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async get() {
    const [config, packages, addons, faqs, reviews, gallery] = await Promise.all([
      strapi.documents(CONFIG_UID).findFirst({
        populate: { bannerImage: true, wechatQr: true },
      }),
      strapi.db.query(PACKAGE_UID).findMany({
        where: { enabled: true },
        orderBy: { sort: "ASC" },
      }),
      strapi.db.query(ADDON_UID).findMany({
        where: { enabled: true },
        orderBy: { sort: "ASC" },
      }),
      strapi.db.query(FAQ_UID).findMany({
        where: { enabled: true },
        orderBy: { sort: "ASC" },
      }),
      strapi.db.query(REVIEW_UID).findMany({
        where: { showOnHome: true },
        orderBy: { sort: "ASC" },
      }),
      strapi.db.query(GALLERY_UID).findMany({
        orderBy: { sort: "ASC" },
        populate: { image: true },
      }),
    ]);

    return {
      config: config || {},
      packages,
      addons,
      faqs,
      reviews,
      gallery,
    };
  },
});
