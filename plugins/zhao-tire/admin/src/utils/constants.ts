export const PRIMARY = "#2563EB";
export const WARM = "#E0523F";

export const STATUS_TEXT: Record<string, string> = {
  pending_accept: "待接单",
  accepted: "待入库",
  stored: "寄存中",
  pending_outbound: "待出库",
  completed: "已完成",
  rejected: "已拒绝",
  canceled: "已取消",
};

export const STATUS_COLOR: Record<string, string> = {
  pending_accept: "gold",
  accepted: "blue",
  stored: "green",
  pending_outbound: "cyan",
  completed: "default",
  rejected: "red",
  canceled: "default",
};

export const SERVICE_TEXT: Record<string, string> = {
  store: "到店送存",
  pickup: "上门取送",
};

export const CAR_TEXT: Record<string, string> = {
  sedan: "轿车",
  suv: "SUV",
  pickup: "皮卡",
};

export const PAYMENT_TEXT: Record<string, string> = {
  unpaid: "未支付",
  deposit_paid: "已付定金",
  paid: "已支付",
};

export const PAYMENT_METHOD_TEXT: Record<string, string> = {
  wechat: "微信支付",
  store_pay: "到店支付",
  pickup_pay: "取货付款",
  deposit: "定金",
  full: "全额",
};

export const SLOT_TEXT: Record<string, string> = {
  morning: "上午",
  afternoon: "下午",
};

export const OUTBOUND_TEXT: Record<string, string> = {
  none: "未申请",
  pending: "审核中",
  approved: "已通过",
  rejected: "已驳回",
};

export const TIMELINE_TEXT: Record<string, string> = {
  created: "提交订单",
  accepted: "商家接单",
  rejected: "商家拒绝",
  canceled: "订单取消",
  inbound: "入库登记",
  outbound_requested: "客户申请出库",
  outbound_approved: "出库申请通过",
  outbound_rejected: "出库申请驳回",
  outbound_done: "出库完成",
  renewed: "续费",
  payment: "收款登记",
  updated: "后台修改",
};

export const SMS_TYPE_TEXT: Record<string, string> = {
  order_created: "下单成功",
  accepted: "已接单",
  inbound: "入库完成",
  due_7: "到期前 7 天",
  due_3: "到期前 3 天",
  outbound_done: "出库完成",
  manual: "手动提醒",
};

export const SMS_STATUS_TEXT: Record<string, string> = {
  pending: "待发送",
  sent: "已发送",
  skipped: "已跳过",
};

export const SMS_STATUS_COLOR: Record<string, string> = {
  pending: "gold",
  sent: "green",
  skipped: "default",
};

export const money = (cents: unknown): string => {
  const value = Number(cents);
  return `¥${((Number.isFinite(value) ? value : 0) / 100).toFixed(2)}`;
};

export const yuanToCents = (value: unknown): number =>
  Math.round((Number(value) || 0) * 100);

export const centsToYuan = (value: unknown): number =>
  Math.round(Number(value) || 0) / 100;

export const dateText = (value: unknown): string => {
  if (!value) return "-";
  return String(value).slice(0, 10);
};

const pad2 = (value: number) => String(value).padStart(2, "0");

export const dateTimeText = (value: unknown): string => {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(
    shifted.getUTCDate()
  )} ${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}`;
};

export const remainingText = (days: unknown): string => {
  const value = Number(days);
  if (!Number.isFinite(value)) return "-";
  if (value > 0) return `剩 ${value} 天`;
  if (value === 0) return "今天到期";
  return `超期 ${Math.abs(value)} 天`;
};

export const remainingColor = (days: unknown): string =>
  Number(days) <= 7 ? WARM : "#1f2937";

export const parseJsonText = (text: string): any => {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed);
};

export const linesToArray = (text: string): string[] =>
  String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
