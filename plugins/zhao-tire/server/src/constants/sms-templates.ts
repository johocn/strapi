export type SmsTemplateType =
  | "order_created"
  | "accepted"
  | "inbound"
  | "due_7"
  | "due_3"
  | "outbound_done"
  | "manual";

/** 可用变量：{name} {orderNo} {expireAt} {daysLeft} {locationCode} {pickupText} {content} */
export const SMS_TEMPLATES: Record<SmsTemplateType, string> = {
  order_created:
    "{name}您好，您的雪地胎寄存订单 {orderNo} 已下单成功，请在订单页保存二维码。",
  accepted:
    "{name}您好，您的雪地胎寄存订单 {orderNo} 已接单，{pickupText}，请保持电话畅通。",
  inbound:
    "{name}您好，您的轮胎已入库，订单 {orderNo}，仓位 {locationCode}，寄存到期日 {expireAt}。",
  due_7:
    "{name}您好，您的雪地胎寄存订单 {orderNo} 将于 {expireAt} 到期（剩余 {daysLeft} 天），请提前安排取胎或续费。",
  due_3:
    "{name}您好，您的雪地胎寄存订单 {orderNo} 将于 {expireAt} 到期（仅剩 {daysLeft} 天），请尽快取胎或续费。",
  outbound_done:
    "{name}您好，您的雪地胎寄存订单 {orderNo} 的轮胎已完成出库，感谢使用雪地胎寄存服务。",
  manual: "{name}您好，{content}",
};

export const SMS_TEMPLATE_VARIABLES = [
  "name",
  "orderNo",
  "expireAt",
  "daysLeft",
  "locationCode",
  "pickupText",
  "content",
];
