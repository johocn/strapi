import type { Core } from "@strapi/strapi";
import { calcPrice } from "./pricing";
import { createError } from "../utils/errors";

const ORDER_UID = "plugin::zhao-tire.tire-order";
const PACKAGE_UID = "plugin::zhao-tire.tire-package";
const ADDON_UID = "plugin::zhao-tire.tire-addon";
const CONFIG_UID = "plugin::zhao-tire.tire-config";
const TIMEZONE = "Asia/Shanghai";
const DEFAULT_MAX_STORAGE_DATE = "2027-05-01";
const MAX_ORDER_NO_ATTEMPTS = 3;
const PHONE_PATTERN = /^1[3-9]\d{9}$/;
const RENEWABLE_STATUS = ["stored", "pending_outbound"];

/** 生成全局唯一的 6 位出库核销码 */
const generateRedemptionCode = async (
  strapi: Core.Strapi
): Promise<string> => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const exists = await strapi.db.query(ORDER_UID).findOne({
      where: { redemptionCode: code },
    });
    if (!exists) return code;
  }
  throw createError("INTERNAL_ERROR", 500, "核销码生成失败，请重试");
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const pad2 = (value: number) => String(value).padStart(2, "0");

export const todayDateString = (): string => {
  const parts = DATE_FORMATTER.formatToParts(new Date());
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

/** 校验并归一化 YYYY-MM-DD，非法返回 null */
export const normalizeDate = (value: unknown): string | null => {
  if (!value) return null;
  const text = String(value).trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
};

export const addMonths = (date: string, months: number): string => {
  const [year, month, day] = date.split("-").map(Number);
  const targetIndex = month - 1 + months;
  const targetYear = year + Math.floor(targetIndex / 12);
  const targetMonth = ((targetIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDay);
  return `${targetYear}-${pad2(targetMonth + 1)}-${pad2(targetDay)}`;
};

/** 起止日期之间的整月数（不足整月按 1 个月计） */
export const monthsBetween = (start: string, end: string): number => {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  let months = (ey - sy) * 12 + (em - sm);
  if (ed > sd) months += 1;
  return Math.max(1, months);
};

export const maskPhone = (phone: unknown): string => {
  const text = String(phone || "");
  if (!text) return "";
  if (text.length >= 7) {
    const head = text.slice(0, 3);
    const tail = text.slice(-4);
    return `${head}****${tail}`;
  }
  return text.replace(/./g, "*");
};

const daysDiff = (from: string, to: string): number => {
  const fromDate = Date.parse(`${from}T00:00:00Z`);
  const toDate = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(fromDate) || Number.isNaN(toDate)) return 0;
  return Math.round((toDate - fromDate) / 86400000);
};

const toDateOnly = (value: unknown): string => {
  if (!value) return "";
  const text = String(value);
  return text.slice(0, 10);
};

const compact = (data: Record<string, unknown>) => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) result[key] = value;
  }
  return result;
};

const isUniqueViolation = (error: any): boolean => {
  const text = `${error?.code || ""} ${error?.message || ""} ${
    error?.details || ""
  }`.toLowerCase();
  return (
    error?.code === "23505" ||
    text.includes("unique") ||
    text.includes("duplicate")
  );
};

const appendTimeline = (
  order: any,
  event: string,
  detail?: string,
  operatorId?: number
) => [
  ...(order.timeline || []),
  {
    at: new Date().toISOString(),
    event,
    ...(operatorId ? { operatorId } : {}),
    ...(detail ? { detail } : {}),
  },
];

const getConfig = async (strapi: Core.Strapi): Promise<any> => {
  return (await strapi.documents(CONFIG_UID).findFirst({})) || {};
};

const findOrder = async (
  strapi: Core.Strapi,
  orderNo: string,
  populate?: any
): Promise<any> => {
  if (!orderNo) return null;
  return strapi.db.query(ORDER_UID).findOne({
    where: { orderNo: String(orderNo) },
    ...(populate ? { populate } : {}),
  });
};

const requireOrder = async (
  strapi: Core.Strapi,
  orderNo: string,
  populate?: any
): Promise<any> => {
  const order = await findOrder(strapi, orderNo, populate);
  if (!order) {
    throw createError("ORDER_NOT_FOUND", 404, "订单不存在");
  }
  return order;
};

const assertStatus = (order: any, allowed: string[], message: string) => {
  if (!allowed.includes(order.status)) {
    throw createError("STATE_INVALID", 400, message);
  }
};

const photoIds = (photos: unknown): number[] => {
  if (!Array.isArray(photos)) return [];
  return photos
    .map((photo: any) =>
      typeof photo === "number" ? photo : Number(photo?.id)
    )
    .filter((id) => Number.isInteger(id) && id > 0);
};

const notFoundPackage = () =>
  createError("VALIDATION_FAILED", 400, "暂无可用的寄存套餐");

const notifySafely = async (
  strapi: Core.Strapi,
  type: string,
  order: any,
  extra?: any
): Promise<void> => {
  try {
    const notify: any = strapi.plugin("zhao-tire").service("notify");
    if (notify && typeof notify.enqueue === "function") {
      await notify.enqueue(type, order, extra);
    }
  } catch (error) {
    strapi.log.warn(`[zhao-tire] ${type} notify skipped: ${error}`);
  }
};

const dayStartIso = (value: unknown): string | null => {
  const date = normalizeDate(value);
  if (!date) return null;
  return new Date(`${date}T00:00:00+08:00`).toISOString();
};

const dayEndIso = (value: unknown): string | null => {
  const date = normalizeDate(value);
  if (!date) return null;
  return new Date(`${date}T23:59:59.999+08:00`).toISOString();
};

/** 后台订单列表与导出共用的筛选条件 */
export const buildOrderWhere = (query: any = {}) => {
  const where: any = {};

  const rawStatus = query?.status;
  if (rawStatus) {
    if (Array.isArray(rawStatus)) {
      where.status = { $in: rawStatus.map((item: unknown) => String(item)) };
    } else if (String(rawStatus).includes(",")) {
      where.status = {
        $in: String(rawStatus)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };
    } else {
      where.status = String(rawStatus);
    }
  }

  const serviceType = String(query?.serviceType || "").trim();
  if (["store", "pickup"].includes(serviceType)) {
    where.serviceType = serviceType;
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

  const from = dayStartIso(query?.dateFrom);
  const to = dayEndIso(query?.dateTo);
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.$gte = from;
    if (to) where.createdAt.$lte = to;
  }

  return where;
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async create(input: any) {
    const payload = input || {};
    const clientToken = String(payload.clientToken || "").trim();
    const customerName = String(payload.customerName || "").trim();
    const phone = String(payload.phone || "").trim();
    const carType = String(payload.carType || "").trim();
    const serviceType = String(payload.serviceType || "").trim();

    if (!clientToken) {
      throw createError("VALIDATION_FAILED", 400, "缺少提交令牌 clientToken");
    }
    if (!customerName) {
      throw createError("VALIDATION_FAILED", 400, "请填写姓名");
    }
    if (!PHONE_PATTERN.test(phone)) {
      throw createError("VALIDATION_FAILED", 400, "请填写正确的手机号");
    }
    if (!["sedan", "suv", "pickup"].includes(carType)) {
      throw createError("VALIDATION_FAILED", 400, "请选择车型");
    }
    if (!["store", "pickup"].includes(serviceType)) {
      throw createError("VALIDATION_FAILED", 400, "请选择服务类型");
    }
    if (payload.agreementAccepted !== true) {
      throw createError("VALIDATION_FAILED", 400, "请先阅读并同意寄存协议");
    }

    const storageStartDate = normalizeDate(payload.storageStartDate);
    if (!storageStartDate) {
      throw createError("VALIDATION_FAILED", 400, "寄存开始日期不合法");
    }
    const expectedReturnDate = normalizeDate(payload.expectedReturnDate);
    if (!expectedReturnDate) {
      throw createError("VALIDATION_FAILED", 400, "预估取回日期不合法");
    }

    const today = todayDateString();
    if (storageStartDate < today) {
      throw createError("VALIDATION_FAILED", 400, "寄存开始日期不能早于今天");
    }

    const config = await getConfig(strapi);
    const maxStorageDate =
      normalizeDate(config.maxStorageDate) || DEFAULT_MAX_STORAGE_DATE;
    if (expectedReturnDate <= storageStartDate) {
      throw createError(
        "VALIDATION_FAILED",
        400,
        "预估取回日期必须晚于寄存开始日期"
      );
    }
    if (expectedReturnDate > maxStorageDate) {
      throw createError(
        "VALIDATION_FAILED",
        400,
        `预估取回日期不能晚于 ${maxStorageDate}`
      );
    }

    let pickupDate: string | null = null;
    let pickupSlot: string | null = null;
    if (serviceType === "pickup") {
      pickupDate = normalizeDate(payload.pickupDate);
      pickupSlot = String(payload.pickupSlot || "").trim() || null;
      if (!pickupDate) {
        throw createError("VALIDATION_FAILED", 400, "请选择上门取胎日期");
      }
      if (pickupDate < storageStartDate) {
        throw createError(
          "VALIDATION_FAILED",
          400,
          "上门日期不能早于寄存开始日期"
        );
      }
      if (!pickupSlot || !["morning", "afternoon"].includes(pickupSlot)) {
        throw createError("VALIDATION_FAILED", 400, "请选择上门时段");
      }
    }

    // 幂等：先按 clientToken 查回原订单
    const existing = await strapi.db.query(ORDER_UID).findOne({
      where: { clientToken },
    });
    if (existing) {
      return {
        orderNo: existing.orderNo,
        amountTotal: existing.amountTotal,
        status: existing.status,
        duplicated: true,
      };
    }

    if (serviceType === "pickup") {
      const slotService: any = strapi
        .plugin("zhao-tire")
        .service("slot");
      await slotService.assertAvailable(pickupDate, pickupSlot);
    }

    const addonCodes = Array.isArray(payload.addonCodes)
      ? payload.addonCodes.map((code: unknown) => String(code)).filter(Boolean)
      : [];
    let addonDocs: any[] = [];
    if (addonCodes.length > 0) {
      addonDocs = await strapi.db.query(ADDON_UID).findMany({
        where: { code: { $in: addonCodes }, enabled: true },
      });
      const foundCodes = new Set(addonDocs.map((doc: any) => doc.code));
      if (
        foundCodes.size !== new Set(addonCodes).size ||
        !addonCodes.every((code: string) => foundCodes.has(code))
      ) {
        throw createError("VALIDATION_FAILED", 400, "所选增值项不可用");
      }
    }

    const packages = await strapi.db.query(PACKAGE_UID).findMany({
      where: { enabled: true },
      orderBy: { sort: "ASC" },
    });
    const priceField = serviceType === "store" ? "storePrice" : "pickupPrice";
    const packageDoc =
      packages.find((item: any) => item[priceField] != null) || packages[0];
    if (!packageDoc) throw notFoundPackage();

    const months = monthsBetween(storageStartDate, expectedReturnDate);
    const addons = addonDocs.map((doc: any) => ({
      code: doc.code,
      name: doc.name,
      price: Number(doc.price) || 0,
      unitText: doc.unitText || "",
    }));
    const { amountPackage, amountAddon, amountTotal } = calcPrice({
      serviceType: serviceType as "store" | "pickup",
      months,
      packageDoc: {
        baseMonths: Number(packageDoc.baseMonths) || 0,
        storePrice: Number(packageDoc.storePrice) || 0,
        pickupPrice: Number(packageDoc.pickupPrice) || 0,
        extraMonthPrice: Number(packageDoc.extraMonthPrice) || 0,
      },
      addons,
    });

    const paymentMethods = ["wechat", "store_pay", "pickup_pay", "deposit", "full"];
    const paymentMethod = paymentMethods.includes(String(payload.paymentMethod))
      ? String(payload.paymentMethod)
      : serviceType === "pickup"
        ? "pickup_pay"
        : "store_pay";

    // 邀请奖励：仅抵扣基础套餐费（增值服务、逾期费不参与）
    const referralService: any = strapi.plugin("zhao-tire").service("referral");
    let rewardInfo: any = null;
    let finalAmountPackage = amountPackage;
    let isFree = false;
    let freeReason: string | undefined = undefined;
    if (payload.useFreeReward === true) {
      rewardInfo = await referralService.reserveReward(phone, amountPackage);
      if (rewardInfo) {
        finalAmountPackage = Math.max(0, amountPackage - rewardInfo.discount);
        isFree = finalAmountPackage + amountAddon <= 0;
        freeReason = "referral_3";
      }
    }
    const finalAmountTotal = finalAmountPackage + amountAddon;

    // 邀请码校验（非必填，但若填了需有效且不能自己邀自己）
    const referralCode = String(payload.referralCode || "").trim().toUpperCase();
    let referrerPhone: string | undefined = undefined;
    if (referralCode) {
      const rc = await referralService.validate(referralCode);
      if (rc.phone === phone) {
        throw createError("VALIDATION_FAILED", 400, "不能使用自己的邀请码");
      }
      referrerPhone = rc.phone;
    }

    const packageSnapshot = {
      id: packageDoc.id,
      name: packageDoc.name,
      code: packageDoc.code,
      baseMonths: Number(packageDoc.baseMonths) || 0,
      storePrice: Number(packageDoc.storePrice) || 0,
      pickupPrice: Number(packageDoc.pickupPrice) || 0,
      extraMonthPrice: Number(packageDoc.extraMonthPrice) || 0,
      overdueDayPrice: Number(packageDoc.overdueDayPrice) || 0,
      durationText: packageDoc.durationText || "",
    };
    const expireAt = expectedReturnDate;
    const now = new Date().toISOString();

    const timelineEvents: any[] = [
      {
        at: now,
        event: "created",
        detail: `订单已提交（${serviceType === "store" ? "到店送存" : "上门取送"}）`,
      },
    ];
    if (rewardInfo) {
      timelineEvents.push({
        at: now,
        event: "free_applied",
        detail: `邀请奖励抵扣基础套餐费 ${rewardInfo.discount} 分（券 ${rewardInfo.rewardNo}）`,
      });
    } else if (isFree) {
      timelineEvents.push({
        at: now,
        event: "free_applied",
        detail: "免单生效",
      });
    }
    if (referralCode) {
      timelineEvents.push({
        at: now,
        event: "referral_applied",
        detail: `使用邀请码 ${referralCode}`,
      });
    }

    const baseData = compact({
      clientToken,
      source: "h5",
      customerName,
      phone,
      plateNo: String(payload.plateNo || "").trim() || undefined,
      carType,
      tireSpec: String(payload.tireSpec || "").trim() || undefined,
      withWheelRim: Boolean(payload.withWheelRim),
      serviceType,
      returnMethod: serviceType === "pickup" ? "pickup_delivery" : undefined,
      pickupDate: pickupDate || undefined,
      pickupSlot: pickupSlot || undefined,
      storageStartDate,
      expectedReturnDate,
      expireAt,
      months,
      packageSnapshot,
      addons,
      amountPackage: finalAmountPackage,
      amountAddon,
      amountTotal: finalAmountTotal,
      paymentMethod: isFree ? "full" : paymentMethod,
      paymentStatus: isFree ? "paid" : "unpaid",
      paidAmount: isFree ? finalAmountTotal : 0,
      rewardNo: rewardInfo?.rewardNo || undefined,
      rewardAmount: rewardInfo?.discount || 0,
      status: "pending_accept",
      outboundRequestStatus: "none",
      note: String(payload.note || "").trim() || undefined,
      agreementAcceptedAt: now,
      referralCode: referralCode || undefined,
      referrerPhone,
      isFree,
      freeReason,
      renewals: [],
      timeline: timelineEvents,
    });

    const orderNoService: any = strapi.plugin("zhao-tire").service("order-no");
    let created: any = null;
    let lastError: any = null;

    for (let attempt = 0; attempt < MAX_ORDER_NO_ATTEMPTS; attempt += 1) {
      const orderNo = await orderNoService.generate();
      try {
        created = await strapi.db.query(ORDER_UID).create({
          data: { ...baseData, orderNo },
        });
        break;
      } catch (error) {
        lastError = error;
        const duplicated = await strapi.db.query(ORDER_UID).findOne({
          where: { clientToken },
        });
        if (duplicated) {
          if (rewardInfo?.rewardNo) {
            await referralService.releaseReward(rewardInfo.rewardNo);
          }
          return {
            orderNo: duplicated.orderNo,
            amountTotal: duplicated.amountTotal,
            status: duplicated.status,
            duplicated: true,
          };
        }
        if (isUniqueViolation(error) && attempt < MAX_ORDER_NO_ATTEMPTS - 1) {
          continue;
        }
        if (isUniqueViolation(error)) {
          throw createError(
            "DUPLICATE_REQUEST",
            409,
            "订单号生成冲突，请重试"
          );
        }
        throw error;
      }
    }

    if (!created) {
      throw lastError || createError("DUPLICATE_REQUEST", 409, "订单创建失败");
    }

    if (rewardInfo?.rewardNo) {
      const bound = await referralService.bindReward(rewardInfo.rewardNo, created.orderNo);
      if (!bound) {
        strapi.log.warn(
          `[zhao-tire] reward ${rewardInfo.rewardNo} 绑定订单 ${created.orderNo} 失败`
        );
      }
    }

    if (referralCode) {
      try {
        await referralService.attachReferral(created, referralCode, {
          openid: payload.openid,
          deviceId: payload.deviceId,
          ip: payload.ip,
        });
      } catch (error) {
        strapi.log.warn(`[zhao-tire] attachReferral skipped: ${error}`);
      }
    }

    await notifySafely(strapi, "order_created", created);

    return {
      orderNo: created.orderNo,
      amountTotal: created.amountTotal,
      status: created.status,
      isFree: created.isFree,
      freeReason: created.freeReason || null,
      referralCode: created.referralCode || null,
      paymentMethod: created.paymentMethod,
      rewardNo: created.rewardNo || null,
      rewardAmount: Number(created.rewardAmount) || 0,
    };
  },

  async detail(orderNo: string, phone: string) {
    const order = await requireOrder(strapi, orderNo, {
      inboundPhotos: true,
    });
    if (!phone || String(phone).trim() !== order.phone) {
      throw createError("PHONE_MISMATCH", 403, "手机号与订单不匹配");
    }

    const snapshot = order.packageSnapshot || {};
    const expireAt = toDateOnly(order.expireAt) || toDateOnly(order.expectedReturnDate);
    const today = todayDateString();
    const diff = expireAt ? daysDiff(today, expireAt) : 0;
    const remainingDays = Math.max(0, diff);
    const overdueDays = Math.max(0, -diff);
    const overdueDayPrice = Number(snapshot.overdueDayPrice) || 0;
    const inboundPhotos = (order.inboundPhotos || []).map((file: any) => ({
      id: file.id,
      name: file.name,
      url: file.url,
      width: file.width,
      height: file.height,
    }));
    const canRenew = RENEWABLE_STATUS.includes(order.status);
    const canRequestOutbound =
      order.status === "stored" &&
      (order.outboundRequestStatus || "none") === "none";

    return {
      orderNo: order.orderNo,
      status: order.status,
      customerName: order.customerName,
      phone: maskPhone(order.phone),
      plateNo: order.plateNo || "",
      carType: order.carType,
      tireSpec: order.tireSpec || "",
      withWheelRim: Boolean(order.withWheelRim),
      serviceType: order.serviceType,
      returnMethod: order.returnMethod || null,
      pickupDate: toDateOnly(order.pickupDate) || null,
      pickupSlot: order.pickupSlot || null,
      storageStartDate: toDateOnly(order.storageStartDate),
      expectedReturnDate: toDateOnly(order.expectedReturnDate),
      expireAt,
      months: Number(order.months) || 0,
      packageSnapshot: snapshot,
      addons: order.addons || [],
      amountPackage: Number(order.amountPackage) || 0,
      amountAddon: Number(order.amountAddon) || 0,
      amountTotal: Number(order.amountTotal) || 0,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      paidAmount: Number(order.paidAmount) || 0,
      outstandingAmount: Math.max(
        0,
        (Number(order.amountTotal) || 0) - (Number(order.paidAmount) || 0)
      ),
      canPayOnline:
        order.paymentStatus !== "paid" &&
        order.paymentMethod === "wechat" &&
        order.status !== "canceled" &&
        order.status !== "rejected",
      rewardNo: order.rewardNo || null,
      rewardAmount: Number(order.rewardAmount) || 0,
      redemptionCode:
        order.status === "stored" || order.status === "pending_outbound"
          ? order.redemptionCode || null
          : null,
      redemptionCodeUsedAt: order.redemptionCodeUsedAt || null,
      referralCode: order.referralCode || null,
      referrerPhone: order.referrerPhone ? maskPhone(order.referrerPhone) : null,
      isFree: Boolean(order.isFree),
      freeReason: order.freeReason || null,
      outboundRequestStatus: order.outboundRequestStatus || "none",
      outboundRequestedAt: order.outboundRequestedAt || null,
      outboundNote: order.outboundNote || "",
      note: order.note || "",
      renewals: order.renewals || [],
      timeline: order.timeline || [],
      locationCode: order.locationCode || "",
      inboundAt: order.inboundAt || null,
      inboundPhotos,
      remainingDays,
      overdueDays,
      overdueFeeEstimate: overdueDays * overdueDayPrice,
      canRenew,
      canRequestOutbound,
      createdAt: order.createdAt,
    };
  },

  async renew(orderNo: string, months: number, paymentMethod?: string) {
    const order = await requireOrder(strapi, orderNo);
    const extendMonths = Number(months);
    if (!Number.isInteger(extendMonths) || extendMonths < 1) {
      throw createError("VALIDATION_FAILED", 400, "续费月数不合法");
    }
    assertStatus(order, RENEWABLE_STATUS, "当前订单状态不可续费");

    const snapshot = order.packageSnapshot || {};
    const basePrice =
      order.serviceType === "store" ? snapshot.storePrice : snapshot.pickupPrice;
    const baseMonths = Number(snapshot.baseMonths) || Number(order.months) || 6;
    const unitPrice =
      Number(snapshot.extraMonthPrice) ||
      Math.round((Number(basePrice) || 0) / baseMonths);
    const amount = unitPrice * extendMonths;
    const fromDate =
      toDateOnly(order.expireAt) ||
      toDateOnly(order.expectedReturnDate) ||
      todayDateString();
    const newExpireAt = addMonths(fromDate, extendMonths);
    const renewals = [
      ...(order.renewals || []),
      {
        months: extendMonths,
        amount,
        paymentMethod: paymentMethod || "store_pay",
        paidAt: null,
        newExpireAt,
        operatorId: null,
      },
    ];
    const timeline = appendTimeline(
      order,
      "renewed",
      `续费 ${extendMonths} 个月，应付 ${amount} 分`
    );

    await strapi.db.query(ORDER_UID).update({
      where: { id: order.id },
      data: { expireAt: newExpireAt, renewals, timeline },
    });

    await notifySafely(strapi, "manual", { ...order, expireAt: newExpireAt }, {
      content: `{name}您好，订单 {orderNo} 已续费 ${extendMonths} 个月，新的到期日为 {expireAt}。`,
    });

    return {
      orderNo: order.orderNo,
      months: extendMonths,
      amount,
      previousExpireAt: fromDate,
      expireAt: newExpireAt,
    };
  },

  async requestOutbound(orderNo: string, note?: string) {
    const order = await requireOrder(strapi, orderNo);
    assertStatus(order, ["stored"], "当前订单状态不可申请出库");
    if ((order.outboundRequestStatus || "none") !== "none") {
      throw createError("STATE_INVALID", 400, "出库申请已提交，请等待审核");
    }

    const outboundRequestedAt = new Date().toISOString();
    const outboundNote = String(note || "").trim();
    const timeline = appendTimeline(
      order,
      "outbound_requested",
      outboundNote ? `出库申请：${outboundNote}` : "出库申请"
    );

    await strapi.db.query(ORDER_UID).update({
      where: { id: order.id },
      data: {
        outboundRequestStatus: "pending",
        outboundRequestedAt,
        outboundNote,
        timeline,
      },
    });

    return {
      orderNo: order.orderNo,
      outboundRequestStatus: "pending",
      outboundRequestedAt,
    };
  },

  async accept(orderNo: string, operatorId?: number) {
    const order = await requireOrder(strapi, orderNo);
    assertStatus(order, ["pending_accept"], "当前订单状态不可接单");
    const timeline = appendTimeline(
      order,
      "accepted",
      "商家已接单",
      operatorId
    );
    await strapi.db.query(ORDER_UID).update({
      where: { id: order.id },
      data: { status: "accepted", timeline },
    });
    await notifySafely(strapi, "accepted", { ...order, status: "accepted" });
    return { orderNo: order.orderNo, status: "accepted" };
  },

  async reject(orderNo: string, reason?: string, operatorId?: number) {
    const order = await requireOrder(strapi, orderNo);
    assertStatus(order, ["pending_accept"], "当前订单状态不可拒绝");
    const timeline = appendTimeline(
      order,
      "rejected",
      reason ? `拒绝原因：${reason}` : "商家已拒绝",
      operatorId
    );
    await strapi.db.query(ORDER_UID).update({
      where: { id: order.id },
      data: { status: "rejected", timeline },
    });
    return { orderNo: order.orderNo, status: "rejected" };
  },

  async cancel(orderNo: string, reason?: string, operatorId?: number) {
    const order = await requireOrder(strapi, orderNo);
    assertStatus(order, ["pending_accept"], "当前订单状态不可取消");
    const timeline = appendTimeline(
      order,
      "canceled",
      reason ? `取消原因：${reason}` : "订单已取消",
      operatorId
    );
    await strapi.db.query(ORDER_UID).update({
      where: { id: order.id },
      data: { status: "canceled", timeline },
    });
    return { orderNo: order.orderNo, status: "canceled" };
  },

  async inbound(
    orderNo: string,
    payload: { photos?: unknown; locationCode?: string; operatorId?: number } = {}
  ) {
    const order = await requireOrder(strapi, orderNo);
    assertStatus(order, ["accepted"], "当前订单状态不可入库");

    const locationCode = String(payload.locationCode || "").trim();
    if (!locationCode) {
      throw createError("VALIDATION_FAILED", 400, "请填写仓位编号");
    }
    const ids = photoIds(payload.photos);
    if (ids.length === 0) {
      throw createError("VALIDATION_FAILED", 400, "请至少上传一张入库照片");
    }

    const inboundAt = new Date().toISOString();
    const config = await getConfig(strapi);
    const redemptionCode =
      config.redemptionCodeEnabled === false
        ? undefined
        : await generateRedemptionCode(strapi);
    const timeline = appendTimeline(
      order,
      "inbound",
      `入库完成，仓位 ${locationCode}`,
      payload.operatorId
    );
    const data = compact({
      status: "stored",
      inboundAt,
      locationCode,
      redemptionCode,
      inboundPhotos: ids.map((id) => ({ id })),
      storageOperator: payload.operatorId
        ? { id: payload.operatorId }
        : undefined,
      timeline,
    });

    await strapi.db.query(ORDER_UID).update({
      where: { id: order.id },
      data,
    });

    // 被邀请人首单入库成功 → 邀请有效，满 3 人发 1 次免单
    try {
      const referralService: any = strapi.plugin("zhao-tire").service("referral");
      const result = await referralService.markValidOnInbound(orderNo);
      if (result?.rewarded) {
        strapi.log.info(
          `[zhao-tire] referral milestone: ${result.referrerPhone} 满 3 个有效邀请，已发放奖励 ${result.reward?.reward?.rewardNo || ""}`
        );
      }
    } catch (error) {
      strapi.log.warn(`[zhao-tire] markValidOnInbound skipped: ${error}`);
    }

    await notifySafely(strapi, "inbound", {
      ...order,
      status: "stored",
      locationCode,
    });

    return {
      orderNo: order.orderNo,
      status: "stored",
      inboundAt,
      locationCode,
      redemptionCode: redemptionCode || null,
    };
  },

  async outbound(
    orderNo: string,
    payload: { photos?: unknown; operatorId?: number; redemptionCode?: string } = {}
  ) {
    const order = await requireOrder(strapi, orderNo);
    assertStatus(order, ["pending_outbound"], "当前订单状态不可出库");

    if (order.redemptionCodeUsedAt) {
      throw createError("STATE_INVALID", 400, "该订单已核销出库，请勿重复操作");
    }

    // 未结清不得出库
    const total = Number(order.amountTotal) || 0;
    const paid = Number(order.paidAmount) || 0;
    const outstanding = Math.max(0, total - paid);
    if (order.isFree !== true && outstanding > 0) {
      // 逾期费口径尚未纳入收银：此处先只统计并留钩子，不阻断出库
      const snapshot = order.packageSnapshot || {};
      const expireAt = toDateOnly(order.expireAt) || toDateOnly(order.expectedReturnDate);
      const overdueDays = expireAt ? Math.max(0, -daysDiff(todayDateString(), expireAt)) : 0;
      const overdueFee = overdueDays * (Number(snapshot.overdueDayPrice) || 0);
      if (overdueFee > 0) {
        strapi.log.warn(
          `[zhao-tire] order ${orderNo} overdue fee hook: ${overdueDays} day(s), ${overdueFee} fen (not enforced)`
        );
      }
      throw createError("PAYMENT_REQUIRED", 400, "订单尚未结清，请先完成收款", {
        amountTotal: total,
        paidAmount: paid,
        outstanding,
        overdueFee,
      });
    }

    // 核销码校验（防重复出库）
    const config = await getConfig(strapi);
    if (config.redemptionCodeEnabled !== false && order.redemptionCode) {
      const provided = String(payload.redemptionCode || "")
        .replace(/\s/g, "")
        .trim();
      if (!provided) {
        throw createError("REDEMPTION_CODE_REQUIRED", 400, "请扫描或输入出库核销码");
      }
      if (provided !== String(order.redemptionCode)) {
        throw createError("REDEMPTION_CODE_INVALID", 400, "核销码不正确");
      }
    }

    const ids = photoIds(payload.photos);
    if (ids.length === 0) {
      throw createError("VALIDATION_FAILED", 400, "请至少上传一张出库照片");
    }

    const outboundAt = new Date().toISOString();
    const timeline = appendTimeline(
      order,
      "outbound_done",
      "轮胎已出库（核销码已验证），订单完成",
      payload.operatorId
    );
    await strapi.db.query(ORDER_UID).update({
      where: { id: order.id },
      data: {
        status: "completed",
        outboundAt,
        outboundPhotos: ids.map((id) => ({ id })),
        redemptionCodeUsedAt: outboundAt,
        timeline,
      },
    });
    await notifySafely(strapi, "outbound_done", {
      ...order,
      status: "completed",
    });
    return { orderNo: order.orderNo, status: "completed", outboundAt };
  },

  async complete(orderNo: string, payload: any = {}) {
    return this.outbound(orderNo, payload);
  },

  async approveOutbound(orderNo: string, operatorId?: number) {
    const order = await requireOrder(strapi, orderNo);
    assertStatus(order, ["stored"], "当前订单状态不可审核出库申请");
    if ((order.outboundRequestStatus || "none") !== "pending") {
      throw createError("STATE_INVALID", 400, "没有待审核的出库申请");
    }
    const timeline = appendTimeline(
      order,
      "outbound_approved",
      "出库申请已通过",
      operatorId
    );
    await strapi.db.query(ORDER_UID).update({
      where: { id: order.id },
      data: {
        status: "pending_outbound",
        outboundRequestStatus: "approved",
        timeline,
      },
    });
    return {
      orderNo: order.orderNo,
      status: "pending_outbound",
      outboundRequestStatus: "approved",
    };
  },

  async rejectOutbound(orderNo: string, reason?: string, operatorId?: number) {
    const order = await requireOrder(strapi, orderNo);
    assertStatus(order, ["stored"], "当前订单状态不可审核出库申请");
    if ((order.outboundRequestStatus || "none") !== "pending") {
      throw createError("STATE_INVALID", 400, "没有待审核的出库申请");
    }
    const timeline = appendTimeline(
      order,
      "outbound_rejected",
      reason ? `出库申请驳回：${reason}` : "出库申请已驳回",
      operatorId
    );
    await strapi.db.query(ORDER_UID).update({
      where: { id: order.id },
      data: {
        outboundRequestStatus: "none",
        timeline,
      },
    });
    return {
      orderNo: order.orderNo,
      status: order.status,
      outboundRequestStatus: "none",
    };
  },

  /** 后台改单：客户 / 车辆 / 日期 / 备注等可编辑字段 */
  async updateDetails(orderNo: string, payload: any = {}, operatorId?: number) {
    const order = await requireOrder(strapi, orderNo);
    const data: any = {};

    for (const key of ["customerName", "plateNo", "tireSpec", "note"]) {
      if (payload[key] !== undefined) {
        data[key] = String(payload[key] ?? "").trim();
      }
    }
    if (data.customerName !== undefined && !data.customerName) {
      throw createError("VALIDATION_FAILED", 400, "客户姓名不能为空");
    }

    if (payload.phone !== undefined) {
      const phone = String(payload.phone || "").trim();
      if (!PHONE_PATTERN.test(phone)) {
        throw createError("VALIDATION_FAILED", 400, "请填写正确的手机号");
      }
      data.phone = phone;
    }

    if (payload.carType !== undefined) {
      const carType = String(payload.carType || "").trim();
      if (!["sedan", "suv", "pickup"].includes(carType)) {
        throw createError("VALIDATION_FAILED", 400, "车型不合法");
      }
      data.carType = carType;
    }

    if (payload.withWheelRim !== undefined) {
      data.withWheelRim = Boolean(payload.withWheelRim);
    }

    if (payload.serviceType !== undefined) {
      const serviceType = String(payload.serviceType || "").trim();
      if (!["store", "pickup"].includes(serviceType)) {
        throw createError("VALIDATION_FAILED", 400, "服务类型不合法");
      }
      data.serviceType = serviceType;
    }

    for (const key of ["pickupDate", "storageStartDate", "expectedReturnDate"]) {
      if (payload[key] === undefined) continue;
      const value = normalizeDate(payload[key]);
      if (!value) {
        throw createError("VALIDATION_FAILED", 400, "日期格式不合法");
      }
      data[key] = value;
    }
    if (payload.expireAt !== undefined) {
      data.expireAt = normalizeDate(payload.expireAt);
    }

    if (payload.pickupSlot !== undefined) {
      const slot = String(payload.pickupSlot || "").trim();
      if (slot && !["morning", "afternoon"].includes(slot)) {
        throw createError("VALIDATION_FAILED", 400, "上门时段不合法");
      }
      data.pickupSlot = slot || null;
    }

    if (payload.months !== undefined) {
      const months = Number(payload.months);
      if (!Number.isInteger(months) || months < 1) {
        throw createError("VALIDATION_FAILED", 400, "寄存月数不合法");
      }
      data.months = months;
    }

    if (payload.locationCode !== undefined) {
      data.locationCode = String(payload.locationCode || "").trim() || null;
    }

    const updatedFields = Object.keys(data);
    if (updatedFields.length === 0) {
      throw createError("VALIDATION_FAILED", 400, "没有可更新的字段");
    }

    data.timeline = appendTimeline(
      order,
      "updated",
      `后台修改：${updatedFields.join(", ")}`,
      operatorId
    );

    await strapi.db.query(ORDER_UID).update({
      where: { id: order.id },
      data,
    });

    return { orderNo: order.orderNo, updated: updatedFields };
  },

  /** 后台收款登记：所有到账统一落 tire-payment 流水 */
  async registerPayment(
    orderNo: string,
    payload: any = {},
    operatorId?: number
  ) {
    const order = await requireOrder(strapi, orderNo);
    const amount = Number(payload?.amount);
    if (!Number.isInteger(amount) || amount <= 0) {
      throw createError("VALIDATION_FAILED", 400, "收款金额不合法（单位：分）");
    }

    const method = String(
      payload?.paymentMethod || payload?.method || order.paymentMethod || "store_pay"
    );
    if (!["store_pay", "pickup_pay", "wechat", "deposit", "full"].includes(method)) {
      throw createError("VALIDATION_FAILED", 400, "支付方式不合法");
    }

    const paymentService: any = strapi.plugin("zhao-tire").service("payment");
    const result = await paymentService.recordManual({
      order,
      amount,
      channel: method,
      idempotencyKey: payload?.idempotencyKey || payload?.clientToken,
      operatorId,
      operatorName: payload?.operatorName,
      note: payload?.note,
      status: payload?.status === "pending" ? "pending" : "paid",
    });

    const paymentStatus = result.order?.paymentStatus || order.paymentStatus;
    const paidAmount = result.order?.paidAmount ?? (Number(order.paidAmount) || 0);
    const timeline = appendTimeline(
      order,
      "payment",
      result.pending
        ? `收款登记待确认 ${amount} 分（${method}，流水 ${result.payment.paymentNo}）`
        : `收款到账 ${amount} 分（${method}，流水 ${result.payment.paymentNo}），累计 ${paidAmount} 分`,
      operatorId
    );

    await strapi.db.query(ORDER_UID).update({
      where: { id: order.id },
      data: { paymentMethod: method, paymentStatus, paidAmount, timeline },
    });

    return {
      orderNo: order.orderNo,
      paymentMethod: method,
      paymentStatus,
      paidAmount,
      paymentNo: result.payment?.paymentNo,
      pending: Boolean(result.pending),
      duplicated: Boolean(result.duplicated),
    };
  },
});
