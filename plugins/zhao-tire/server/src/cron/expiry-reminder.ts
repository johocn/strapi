import type { Core } from "@strapi/strapi";

const ORDER_UID = "plugin::zhao-tire.tire-order";
const TIMEZONE_OFFSET_MS = 8 * 60 * 60 * 1000;
const REMIND_OFFSETS: Array<{ days: number; type: "due_7" | "due_3" }> = [
  { days: 7, type: "due_7" },
  { days: 3, type: "due_3" },
];

/** Asia/Shanghai 时区下「今天 + offsetDays」的 YYYY-MM-DD */
const dateAfter = (offsetDays: number, now: Date = new Date()): string =>
  new Date(now.getTime() + TIMEZONE_OFFSET_MS + offsetDays * 86400000)
    .toISOString()
    .slice(0, 10);

const runExpiryReminder = async ({ strapi }: { strapi: Core.Strapi }) => {
  const notify: any = strapi.plugin("zhao-tire").service("notify");
  let total = 0;

  for (const target of REMIND_OFFSETS) {
    const expireAt = dateAfter(target.days);
    const orders = await strapi.db.query(ORDER_UID).findMany({
      where: { status: "stored", expireAt },
    });

    for (const order of orders) {
      try {
        await notify.enqueue(target.type, order, {
          daysLeft: target.days,
          expireAt,
        });
        total += 1;
      } catch (error) {
        strapi.log.warn(
          `[zhao-tire] ${target.type} 提醒生成失败（${order?.orderNo}）：${error}`
        );
      }
    }
  }

  strapi.log.info(`[zhao-tire] 临期提醒扫描完成，共处理 ${total} 个订单`);
  return total;
};

export default runExpiryReminder;
