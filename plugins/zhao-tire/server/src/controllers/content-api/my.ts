import { createError, sendError } from "../../utils/errors";

const ORDER_UID = "plugin::zhao-tire.tire-order";
const SHARE_UID = "plugin::zhao-tire.tire-share-record";
const PHONE_PATTERN = /^1[3-9]\d{9}$/;

const dateOnly = (value: any): string => {
  if (!value) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  return text.slice(0, 10);
};

/** 从 Bearer Token 换取 SSO 用户（手机号用于匹配寄存订单） */
async function requireUser(ctx: any) {
  const match = String(ctx.request.headers?.authorization || "").match(
    /^Bearer\s+(.+)$/i
  );
  if (!match) throw createError("UNAUTHORIZED", 401, "请先登录");
  const service: any = (strapi as any).plugin("zhao-sso")?.service?.("sso-auth");
  if (!service?.verifyToken) {
    throw createError("UNAUTHORIZED", 401, "统一登录服务不可用");
  }
  let verified: any;
  try {
    verified = await service.verifyToken(match[1].trim());
  } catch (error: any) {
    // JWT 解析失败等无状态码的异常统一按登录失效处理，前端会清理会话并引导重新登录
    const status = Number(error?.status);
    if (status && status < 500) throw error;
    throw createError("UNAUTHORIZED", 401, "登录已失效，请重新登录");
  }
  const user = verified?.user;
  const phone = String(user?.mobile || "").trim();
  if (!PHONE_PATTERN.test(phone)) {
    throw createError("UNAUTHORIZED", 401, "账号未绑定手机号");
  }
  return { phone, nickname: String(user?.nickname || "") };
}

const toSummary = (order: any) => ({
  orderNo: order.orderNo,
  status: order.status,
  serviceType: order.serviceType,
  customerName: order.customerName,
  plateNo: order.plateNo || "",
  tireSpec: order.tireSpec || "",
  storageStartDate: dateOnly(order.storageStartDate),
  expectedReturnDate: dateOnly(order.expectedReturnDate),
  expireAt: dateOnly(order.expireAt),
  months: Number(order.months) || 0,
  amountTotal: Number(order.amountTotal) || 0,
  paymentStatus: order.paymentStatus,
  createdAt: order.createdAt,
});

export default {
  async me(ctx: any) {
    try {
      ctx.body = await requireUser(ctx);
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async orders(ctx: any) {
    try {
      const user = await requireUser(ctx);
      const rows = await strapi.db
        .query(ORDER_UID)
        .findMany({ where: { phone: user.phone }, orderBy: { createdAt: "DESC" } });
      ctx.body = { ...user, orders: rows.map(toSummary) };
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async referral(ctx: any) {
    try {
      const user = await requireUser(ctx);
      const referralService: any = strapi.plugin("zhao-tire").service("referral");
      const rc = await referralService.ensureForPhone(user.phone, user.nickname);
      const REFERRAL_THRESHOLD = 3;
      const completed = Number(rc.completedCount) || 0;
      const progress = completed % REFERRAL_THRESHOLD;
      ctx.body = {
        code: rc.code,
        phone: rc.phone,
        nickname: rc.nickname || user.nickname || "",
        usedCount: Number(rc.usedCount) || 0,
        completedCount: completed,
        pendingFreeCount: Number(rc.pendingFreeCount) || 0,
        totalFreeCount: Number(rc.totalFreeCount) || 0,
        threshold: REFERRAL_THRESHOLD,
        progress: progress,
        progressNextIn: REFERRAL_THRESHOLD - progress,
      };
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async rewards(ctx: any) {
    try {
      const user = await requireUser(ctx);
      const referralService: any = strapi.plugin("zhao-tire").service("referral");
      ctx.body = await referralService.listRewards(user.phone);
    } catch (error) {
      sendError(ctx, error);
    }
  },

  /** 我的邀请明细（仅本人作为分享人的记录），服务端分页 */
  async shareRecords(ctx: any) {
    try {
      const user = await requireUser(ctx);
      const query = ctx.query || {};
      const page = Math.max(1, Number(query.page) || 1);
      const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 10));
      const where: any = { referrerPhone: user.phone };
      if (query.status) where.status = String(query.status);
      if (query.from || query.to) {
        where.boundAt = {};
        if (query.from) where.boundAt.$gte = `${String(query.from).slice(0, 10)}T00:00:00.000Z`;
        if (query.to) where.boundAt.$lte = `${String(query.to).slice(0, 10)}T23:59:59.999Z`;
      }
      const [rows, total] = await Promise.all([
        strapi.db.query(SHARE_UID).findMany({
          where,
          orderBy: { id: "DESC" },
          limit: pageSize,
          offset: (page - 1) * pageSize,
        }),
        strapi.db.query(SHARE_UID).count({ where }),
      ]);
      ctx.body = {
        data: (rows || []).map((row: any) => ({
          id: row.id,
          inviteePhone: row.inviteePhone
            ? `${String(row.inviteePhone).slice(0, 3)}****${String(row.inviteePhone).slice(-4)}`
            : "",
          orderNo: row.orderNo || "",
          status: row.status,
          boundAt: row.boundAt || null,
          validAt: row.validAt || null,
        })),
        pagination: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      sendError(ctx, error);
    }
  },
};
