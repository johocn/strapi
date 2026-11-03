import type { Core } from "@strapi/strapi";
import { createError } from "../utils/errors";

const ORDER_UID = "plugin::zhao-tire.tire-order";
const ACTIVE_STATUSES = ["stored", "pending_outbound"];
const TIMEZONE_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const toDateOnly = (value: unknown): string =>
  value ? String(value).slice(0, 10) : "";

const shanghaiToday = (now: Date = new Date()): string =>
  new Date(now.getTime() + TIMEZONE_OFFSET_MS).toISOString().slice(0, 10);

const dateAfter = (offsetDays: number, now: Date = new Date()): string =>
  new Date(now.getTime() + TIMEZONE_OFFSET_MS + offsetDays * DAY_MS)
    .toISOString()
    .slice(0, 10);

const remainingDays = (expireAt: unknown): number => {
  const date = toDateOnly(expireAt);
  if (!date) return 0;
  const target = Date.parse(`${date}T00:00:00+08:00`);
  const today = Date.parse(`${shanghaiToday()}T00:00:00+08:00`);
  if (Number.isNaN(target) || Number.isNaN(today)) return 0;
  return Math.round((target - today) / DAY_MS);
};

const withRemaining = (order: any) => ({
  ...order,
  remainingDays: remainingDays(order.expireAt),
});

const REMIND_CONTENT =
  "{name}您好，您的雪地胎寄存订单 {orderNo} 将于 {expireAt} 到期（剩余 {daysLeft} 天），请及时取胎或续费。";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async list(query: any = {}) {
    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(query?.pageSize) || 20)
    );
    const where: any = { status: { $in: ACTIVE_STATUSES } };

    const locationCode = String(query?.locationCode || "").trim();
    if (locationCode) {
      where.locationCode = { $containsi: locationCode };
    }

    const keyword = String(query?.keyword || "").trim();
    if (keyword) {
      where.$or = [
        { orderNo: { $containsi: keyword } },
        { phone: { $containsi: keyword } },
        { plateNo: { $containsi: keyword } },
        { customerName: { $containsi: keyword } },
      ];
    }

    const [data, total] = await Promise.all([
      strapi.db.query(ORDER_UID).findMany({
        where,
        orderBy: { expireAt: "ASC" },
        populate: { inboundPhotos: true },
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      strapi.db.query(ORDER_UID).count({ where }),
    ]);

    return {
      data: data.map(withRemaining),
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  },

  async expiring(query: any = {}) {
    const rawDays = Number(query?.days);
    const days = Number.isInteger(rawDays) && rawDays > 0 ? rawDays : 7;
    const limitDate = dateAfter(days);

    const where: any = {
      status: { $in: ACTIVE_STATUSES },
      expireAt: { $lte: limitDate },
    };
    const locationCode = String(query?.locationCode || "").trim();
    if (locationCode) {
      where.locationCode = { $containsi: locationCode };
    }

    const data = await strapi.db.query(ORDER_UID).findMany({
      where,
      orderBy: { expireAt: "ASC" },
      populate: { inboundPhotos: true },
    });

    return {
      data: data.map(withRemaining),
      days,
      limitDate,
      total: data.length,
    };
  },

  async remind(payload: any = {}, operatorId?: number) {
    const rawIds = payload?.ids ?? payload?.orderIds;
    const ids = (Array.isArray(rawIds) ? rawIds : [rawIds])
      .map((item: unknown) => Number(item))
      .filter((id: number) => Number.isInteger(id) && id > 0);

    if (ids.length === 0) {
      throw createError("VALIDATION_FAILED", 400, "请选择需要提醒的订单");
    }

    const orders = await strapi.db.query(ORDER_UID).findMany({
      where: { id: { $in: ids } },
    });
    const notify: any = strapi.plugin("zhao-tire").service("notify");
    let queued = 0;
    let skipped = 0;

    for (const order of orders) {
      if (!order.phone) {
        skipped += 1;
        continue;
      }
      try {
        await notify.enqueue("manual", order, {
          content: REMIND_CONTENT,
          operatorId,
        });
        queued += 1;
      } catch (error) {
        skipped += 1;
        strapi.log.warn(
          `[zhao-tire] 批量提醒失败（${order.orderNo}）：${error}`
        );
      }
    }

    return {
      requested: ids.length,
      queued,
      skipped: skipped + (ids.length - orders.length),
    };
  },
});
