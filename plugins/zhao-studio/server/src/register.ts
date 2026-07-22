import permissions from './permissions';

export default ({ strapi }: { strapi: any }) => {
  strapi.admin.services.permission.actionProvider.registerMany(
    permissions.actions
  );

  try {
    strapi.plugin("zhao-common").service("i18n").setMessages({
      STUDIO_PROMO_CHANNEL_NOT_FOUND: "推广渠道不存在",
      STUDIO_PROMO_CHANNEL_CODE_DUPLICATE: "渠道 code 重复",
      STUDIO_PROMO_CAMPAIGN_NOT_FOUND: "营销活动不存在",
      STUDIO_PROMO_CAMPAIGN_CODE_DUPLICATE: "活动 code 重复",
      STUDIO_PROMO_CAMPAIGN_CHANNEL_REQUIRED: "活动必须关联渠道",
      STUDIO_PROMO_EXPERIMENT_NOT_FOUND: "A/B 实验不存在",
      STUDIO_PROMO_EXPERIMENT_NO_VARIANTS: "实验无变体",
      STUDIO_PROMO_EXPERIMENT_NOT_RUNNING: "实验未运行",
      STUDIO_PROMO_VARIANT_NOT_FOUND: "变体不存在",
      STUDIO_PROMO_VARIANT_NO_CONTENT: "变体未关联文章或优惠券",
      STUDIO_PROMO_PLATFORM_CONFIG_DUPLICATE: "渠道+平台配置重复",
    });
  } catch {}
};