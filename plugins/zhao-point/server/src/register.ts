import type { Core } from "@strapi/strapi";

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  try {
    const i18n = strapi.plugin("zhao-common").service("i18n");
    i18n.setMessages({
      POINT_001: "积分规则不存在 (action={action})",
      POINT_002: "积分余额不足",
      POINT_003: "积分操作失败",
      POINT_004: "已达每日积分上限",
      POINT_005: "兑换失败 - 积分不足",
      POINT_006: "兑换记录不存在",
      POINT_007: "积分调整失败 - 用户不存在",
      POINT_008: "批量调整失败 - 部分记录未处理",
      POINT_009: "积分规则已存在 (action={action})",
      POINT_010: "无效的积分操作类型",
      POINT_011: "一次性奖励已领取过 (action={action})",
      POINT_012: "积分过期扣除",
      POINT_013: "商品不存在或已下架",
      POINT_014: "商品库存不足",
      POINT_015: "已达该商品最大兑换数量",
      POINT_016: "兑换订单状态错误",
      POINT_017: "核销码无效或已过期",
      POINT_018: "渠道层级关系校验失败",
      POINT_019: "积分模块未启用",
      POINT_020: "功能模块已关闭，请联系管理员",
      POINT_021: "自提点不存在",
      POINT_022: "该自提点不支持此商品的渠道",
      POINT_023: "提货码无效，未找到对应兑换记录",
      POINT_024: "该订单非自提订单，无法扫码兑付",
      POINT_025: "订单状态不允许兑付",
    });
  } catch {
    // zhao-common 未安装, 跳过 i18n 注册
  }
};

export default register;
