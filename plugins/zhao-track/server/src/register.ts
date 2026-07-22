import type { Core } from "@strapi/strapi";
import permissions from "./permissions";

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.admin.services.permission.actionProvider.registerMany(permissions.actions);
  try {
    strapi.plugin("zhao-common").service("i18n").setMessages({
      TRACK_SOURCE_INVALID: "来源参数不合法（sourceTagId 和 utm 都未提供）",
      TRACK_CLICK_RATE_LIMITED: "点击频率超限",
      TRACK_ATTRIBUTION_NO_MATCH: "归因查询无匹配订单",
      TRACK_COUPON_NOT_FOUND: "优惠券不存在",
    });
  } catch {}
};
export default register;
