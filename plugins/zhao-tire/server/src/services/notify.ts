import type { Core } from "@strapi/strapi";
import {
  SMS_TEMPLATES,
  type SmsTemplateType,
} from "../constants/sms-templates";
import { createError } from "../utils/errors";

const SMS_LOG_UID = "plugin::zhao-tire.tire-sms-log";
const CONFIG_UID = "plugin::zhao-tire.tire-config";
const TIMEZONE_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const LOG_STATUS = ["pending", "sent", "skipped"];

const toDateOnly = (value: unknown): string => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const shanghaiToday = (now: Date = new Date()): string =>
  new Date(now.getTime() + TIMEZONE_OFFSET_MS).toISOString().slice(0, 10);

const dayStartIso = (now: Date = new Date()): string => {
  const shifted = new Date(now.getTime() + TIMEZONE_OFFSET_MS);
  const startUtc =
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate()
    ) - TIMEZONE_OFFSET_MS;
  return new Date(startUtc).toISOString();
};

const daysUntil = (expireAt: string): number => {
  if (!expireAt) return 0;
  const target = Date.parse(`${expireAt}T00:00:00+08:00`);
  const today = Date.parse(`${shanghaiToday()}T00:00:00+08:00`);
  if (Number.isNaN(target) || Number.isNaN(today)) return 0;
  return Math.round((target - today) / DAY_MS);
};

const renderTemplate = (
  template: string,
  vars: Record<string, string | number>
): string =>
  template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? "" : String(value);
  });

const buildVariables = (order: any, extra: any = {}) => {
  const expireAt = toDateOnly(
    extra?.expireAt ?? order?.expireAt ?? order?.expectedReturnDate
  );
  const rawDaysLeft =
    extra?.daysLeft !== undefined
      ? Number(extra.daysLeft)
      : expireAt
        ? daysUntil(expireAt)
        : 0;
  const slotText =
    order?.pickupSlot === "afternoon"
      ? "下午"
      : order?.pickupSlot === "morning"
        ? "上午"
        : "";
  const pickupDate = toDateOnly(order?.pickupDate);
  const pickupText =
    order?.serviceType === "pickup"
      ? `上门取胎时间 ${pickupDate} ${slotText}`.replace(/\s+/g, " ").trim()
      : "请按预约时间到店送胎";

  return {
    name: String(order?.customerName || ""),
    orderNo: String(order?.orderNo || ""),
    expireAt,
    daysLeft: Number.isFinite(rawDaysLeft) ? Math.max(0, rawDaysLeft) : 0,
    locationCode: String(extra?.locationCode ?? order?.locationCode ?? ""),
    pickupText,
    content: String(extra?.content || ""),
  };
};

const loadConfig = async (strapi: Core.Strapi): Promise<any> => {
  try {
    return (await strapi.documents(CONFIG_UID).findFirst({})) || {};
  } catch {
    return {};
  }
};

const resolveTemplate = (
  config: any,
  type: SmsTemplateType,
  extra: any = {}
): string => {
  if (extra?.content) return String(extra.content);
  const override = config?.smsTemplateOverride;
  if (
    override &&
    typeof override === "object" &&
    typeof override[type] === "string" &&
    override[type].trim()
  ) {
    return override[type];
  }
  return SMS_TEMPLATES[type] || "";
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 渲染通知并落 tire-sms-log；同订单同类型当日去重。
   * 发送失败只记录 warn，不影响主流程。
   */
  async enqueue(
    type: SmsTemplateType,
    order: any,
    extra: any = {}
  ): Promise<any> {
    if (!order || !order.phone) return null;

    const config = await loadConfig(strapi);
    const template = resolveTemplate(config, type, extra);
    if (!template) return null;

    const content = renderTemplate(template, buildVariables(order, extra));
    const phone = String(order.phone);

    if (order.id) {
      const existing = await strapi.db.query(SMS_LOG_UID).findOne({
        where: {
          type,
          order: { id: order.id },
          createdAt: { $gte: dayStartIso() },
        },
      });
      if (existing) return { ...existing, duplicated: true };
    }

    const data: any = { type, phone, content, status: "pending" };
    if (order.id) data.order = { id: order.id };
    const operatorId = Number(extra?.operatorId);
    if (Number.isInteger(operatorId) && operatorId > 0) {
      data.operator = { id: operatorId };
    }

    const log = await strapi.db.query(SMS_LOG_UID).create({ data });

    try {
      const provider: any = strapi.plugin("zhao-tire").service("sms-provider");
      const result = await provider.send({ phone, content });
      if (result?.sent && log?.id) {
        const sentAt = new Date().toISOString();
        await strapi.db.query(SMS_LOG_UID).update({
          where: { id: log.id },
          data: { status: "sent", sentAt },
        });
        log.status = "sent";
        log.sentAt = sentAt;
      }
    } catch (error) {
      strapi.log.warn(`[zhao-tire] 短信发送失败（保留队列）：${error}`);
    }

    return log;
  },

  async list(query: any = {}) {
    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.min(
      200,
      Math.max(1, Number(query?.pageSize) || 20)
    );
    const where: any = {};
    if (query?.type) where.type = String(query.type);
    if (query?.status) where.status = String(query.status);
    if (query?.phone) where.phone = { $containsi: String(query.phone) };
    if (query?.orderNo) {
      where.order = { orderNo: { $containsi: String(query.orderNo) } };
    }

    const [data, total] = await Promise.all([
      strapi.db.query(SMS_LOG_UID).findMany({
        where,
        orderBy: { createdAt: "DESC" },
        populate: { order: true },
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      strapi.db.query(SMS_LOG_UID).count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  },

  async update(id: number, payload: any = {}, operatorId?: number) {
    const logId = Number(id);
    if (!Number.isInteger(logId) || logId <= 0) {
      throw createError("VALIDATION_FAILED", 400, "通知记录 id 不合法");
    }
    const existing = await strapi.db.query(SMS_LOG_UID).findOne({
      where: { id: logId },
    });
    if (!existing) {
      throw createError("ORDER_NOT_FOUND", 404, "通知记录不存在");
    }

    const status = String(payload?.status || "");
    if (!LOG_STATUS.includes(status)) {
      throw createError("VALIDATION_FAILED", 400, "通知状态不合法");
    }

    const data: any = { status };
    if (status === "sent") data.sentAt = new Date().toISOString();
    if (payload?.content !== undefined) {
      data.content = String(payload.content).trim();
    }
    if (Number.isInteger(Number(operatorId)) && Number(operatorId) > 0) {
      data.operator = { id: Number(operatorId) };
    }

    return strapi.db.query(SMS_LOG_UID).update({
      where: { id: logId },
      data,
    });
  },
});
