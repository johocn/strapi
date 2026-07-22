import type { Core } from "@strapi/strapi";
import permissions from "./permissions";

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.admin.services.permission.actionProvider.registerMany(permissions.actions);
  try {
    strapi.plugin("zhao-common").service("i18n").setMessages({
      DEAL_ADAPTER_NOT_FOUND: "平台 adapter 未注册: {platformCode}",
      DEAL_COUPON_NOT_FOUND: "优惠券不存在",
      DEAL_COUPON_OFFLINE: "优惠券已下线",
      DEAL_COLLECTION_NOT_FOUND: "优惠券合集不存在",
      DEAL_CANDIDATE_NOT_FOUND: "候选记录不存在",
      DEAL_CANDIDATE_ALREADY_IMPORTED: "候选已导入，不可重复审核",
      DEAL_SYNC_FAILED: "同步失败: {message}",
    });
  } catch { /* zhao-common 未安装 */ }
};

export default register;
