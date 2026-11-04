import type { Core } from "@strapi/strapi";

const actions = [
  { section: "plugins", pluginName: "zhao-tire", uid: "order.read", displayName: "读取订单" },
  { section: "plugins", pluginName: "zhao-tire", uid: "order.accept", displayName: "接单" },
  { section: "plugins", pluginName: "zhao-tire", uid: "order.reject", displayName: "拒绝订单" },
  { section: "plugins", pluginName: "zhao-tire", uid: "order.update", displayName: "修改订单" },
  { section: "plugins", pluginName: "zhao-tire", uid: "order.inbound", displayName: "入库登记" },
  { section: "plugins", pluginName: "zhao-tire", uid: "order.outbound", displayName: "出库登记" },
  { section: "plugins", pluginName: "zhao-tire", uid: "order.payment", displayName: "收款登记" },
  { section: "plugins", pluginName: "zhao-tire", uid: "payment.read", displayName: "查看支付流水" },
  { section: "plugins", pluginName: "zhao-tire", uid: "order.export", displayName: "导出订单" },
  { section: "plugins", pluginName: "zhao-tire", uid: "package.manage", displayName: "管理套餐" },
  { section: "plugins", pluginName: "zhao-tire", uid: "config.manage", displayName: "管理站点配置" },
  { section: "plugins", pluginName: "zhao-tire", uid: "content.manage", displayName: "管理站点内容" },
  { section: "plugins", pluginName: "zhao-tire", uid: "customer.read", displayName: "查看客户" },
  { section: "plugins", pluginName: "zhao-tire", uid: "sms.manage", displayName: "管理短信通知" },
];

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("[zhao-tire] register");

  try {
    strapi.admin.services.permission.actionProvider.registerMany(actions);
  } catch (err) {
    strapi.log.warn(`[zhao-tire] permission actions register failed: ${err}`);
  }
};

export default register;
