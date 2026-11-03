import type { Core } from "@strapi/strapi";

const ORDER_UID = "plugin::zhao-tire.tire-order";
const TIMEZONE = "Asia/Shanghai";

const DAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 取 Asia/Shanghai 时区的 YYMMDD 日期戳 */
export const dayStamp = (now: Date = new Date()): string => {
  const parts = DAY_FORMATTER.formatToParts(now);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value || "";
  const year = get("year").slice(-2);
  return `${year}${get("month")}${get("day")}`;
};

/** 订单号：XT + YYMMDD + '-' + 4 位当日序号 */
export const formatOrderNo = (now: Date, sequence: number): string => {
  const seq = Math.max(1, Math.trunc(Number(sequence) || 0));
  return `XT${dayStamp(now)}-${String(seq).padStart(4, "0")}`;
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  dayStamp,

  formatOrderNo,

  /** 按当日已有单量生成下一个单号；唯一冲突由调用方重试 */
  async generate(now: Date = new Date()): Promise<string> {
    const prefix = `XT${dayStamp(now)}`;
    const count = await strapi.db.query(ORDER_UID).count({
      where: { orderNo: { $startsWith: prefix } },
    });
    return formatOrderNo(now, count + 1);
  },
});

export const ORDER_NO_PATTERN = /^XT\d{6}-\d{4}$/;
