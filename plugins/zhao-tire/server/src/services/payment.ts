import type { Core } from "@strapi/strapi";

const PAYMENT_UID = "plugin::zhao-tire.tire-payment";
const ORDER_UID = "plugin::zhao-tire.tire-order";

const CHANNELS = ["wechat", "store_pay", "pickup_pay", "deposit", "full", "mock"];

const toNumber = (value: unknown, fallback = 0): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

function throwErr(code: string, status: number, message: string, details?: any): never {
  const error: any = new Error(message);
  error.code = code;
  error.status = status;
  if (details) error.details = details;
  throw error;
}

function generatePaymentNo(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `PAY${stamp}${rand}`;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findOrder(orderNo: string) {
    const order = await strapi.db.query(ORDER_UID).findOne({ where: { orderNo } });
    if (!order) throwErr("ORDER_NOT_FOUND", 404, "订单不存在");
    return order;
  },

  outstandingOf(order: any): number {
    return Math.max(0, toNumber(order.amountTotal) - toNumber(order.paidAmount));
  },

  /** 创建 pending 流水（幂等键已存在则直接返回原流水） */
  async ensurePending(params: {
    order: any;
    amount: number;
    channel: string;
    idempotencyKey: string;
    provider?: string;
    externalNo?: string;
    raw?: any;
    note?: string;
  }) {
    const channel = CHANNELS.includes(params.channel) ? params.channel : "store_pay";
    const existing: any = await strapi.db.query(PAYMENT_UID).findOne({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing) return existing;

    if (params.amount <= 0) {
      throwErr("AMOUNT_INVALID", 400, "支付金额必须大于 0");
    }
    const outstanding = this.outstandingOf(params.order);
    if (params.amount > outstanding) {
      throwErr("AMOUNT_EXCEEDED", 400, "支付金额超过订单未结金额", {
        outstanding,
        amount: params.amount,
      });
    }

    return strapi.db.query(PAYMENT_UID).create({
      data: {
        paymentNo: generatePaymentNo(),
        orderNo: params.order.orderNo,
        orderId: params.order.id,
        channel,
        amount: params.amount,
        status: "pending",
        idempotencyKey: params.idempotencyKey,
        provider: params.provider || "manual",
        externalNo: params.externalNo || null,
        note: params.note || null,
        raw: params.raw || null,
      },
    });
  },

  /**
   * 把流水置为 paid 并同步订单累计金额
   * - 幂等：已 paid 的流水直接返回 duplicated
   * - 金额上限：流水金额不得超过订单未结金额
   */
  async settle(paymentNo: string, options: { externalNo?: string; raw?: any } = {}) {
    const payment: any = await strapi.db.query(PAYMENT_UID).findOne({
      where: { paymentNo },
    });
    if (!payment) throwErr("PAYMENT_NOT_FOUND", 404, "支付流水不存在");
    if (payment.status === "paid") {
      return { duplicated: true, payment };
    }
    if (payment.status !== "pending") {
      throwErr("PAYMENT_STATE_INVALID", 400, "该流水当前状态不可确认", {
        status: payment.status,
      });
    }

    const order = await this.findOrder(payment.orderNo);
    const total = toNumber(order.amountTotal);
    const paid = toNumber(order.paidAmount);
    const outstanding = Math.max(0, total - paid);
    if (payment.amount > outstanding) {
      throwErr("AMOUNT_EXCEEDED", 400, "支付金额超过订单未结金额", {
        outstanding,
        amount: payment.amount,
      });
    }

    const paidAmount = paid + payment.amount;
    const paymentStatus =
      total <= 0 || paidAmount >= total
        ? "paid"
        : paidAmount > 0
          ? "deposit_paid"
          : "unpaid";

    const paidAt = new Date().toISOString();
    const updatedPayment = await strapi.db.query(PAYMENT_UID).update({
      where: { id: payment.id, status: "pending" },
      data: {
        status: "paid",
        paidAt,
        externalNo: options.externalNo || payment.externalNo || null,
        raw: options.raw || payment.raw || null,
      },
    });
    if (!updatedPayment) {
      const again: any = await strapi.db.query(PAYMENT_UID).findOne({
        where: { paymentNo },
      });
      if (again?.status === "paid") return { duplicated: true, payment: again };
      throwErr("PAYMENT_STATE_INVALID", 409, "流水状态已被修改，请刷新后重试");
    }

    await strapi.db.query(ORDER_UID).update({
      where: { id: order.id },
      data: { paidAmount, paymentStatus },
    });

    return {
      duplicated: false,
      payment: updatedPayment,
      order: { orderNo: order.orderNo, paidAmount, paymentStatus },
    };
  },

  /** 人工收款登记（门店收银 / 取货付款 / 后台确认到账） */
  async recordManual(params: {
    order: any;
    amount: number;
    channel: string;
    idempotencyKey?: string;
    operatorId?: number | string;
    operatorName?: string;
    note?: string;
    status?: "pending" | "paid";
  }) {
    const channel = CHANNELS.includes(params.channel) ? params.channel : "store_pay";
    const idempotencyKey =
      params.idempotencyKey ||
      `manual:${params.order.orderNo}:${channel}:${params.amount}:${params.operatorId || 0}:${Date.now()}`;

    const existing: any = await strapi.db.query(PAYMENT_UID).findOne({
      where: { idempotencyKey },
    });
    if (existing) {
      if (existing.status === "pending" && params.status === "paid") {
        return this.settle(existing.paymentNo);
      }
      return { duplicated: true, payment: existing };
    }

    if (params.amount <= 0) throwErr("AMOUNT_INVALID", 400, "收款金额必须大于 0");
    const outstanding = this.outstandingOf(params.order);
    if (params.amount > outstanding) {
      throwErr("AMOUNT_EXCEEDED", 400, "收款金额超过订单未结金额", {
        outstanding,
        amount: params.amount,
      });
    }

    const payment: any = await strapi.db.query(PAYMENT_UID).create({
      data: {
        paymentNo: generatePaymentNo(),
        orderNo: params.order.orderNo,
        orderId: params.order.id,
        channel,
        amount: params.amount,
        status: "pending",
        idempotencyKey,
        provider: "manual",
        operatorName: params.operatorName || null,
        operator: params.operatorId || null,
        note: params.note || null,
      },
    });

    if (params.status === "pending") {
      return { duplicated: false, payment, pending: true };
    }
    return this.settle(payment.paymentNo, { externalNo: `MANUAL-${payment.paymentNo}` });
  },

  async list(query: { page?: number; pageSize?: number; status?: string; orderNo?: string; channel?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.orderNo) where.orderNo = query.orderNo;
    if (query.channel) where.channel = query.channel;

    const [rows, total] = await Promise.all([
      strapi.db.query(PAYMENT_UID).findMany({
        where,
        orderBy: { id: "DESC" },
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      strapi.db.query(PAYMENT_UID).count({ where }),
    ]);
    return {
      data: rows,
      meta: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
    };
  },

  /** 退款：回滚累计金额，整单退清时回滚邀请与奖励 */
  async refund(params: {
    order: any;
    amount: number;
    operatorId?: number | string;
    operatorName?: string;
    note?: string;
  }) {
    const order = params.order;
    const paid = toNumber(order.paidAmount);
    const amount = Math.round(params.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throwErr("AMOUNT_INVALID", 400, "退款金额必须大于 0");
    }
    if (amount > paid) {
      throwErr("REFUND_EXCEEDED", 400, "退款金额超过已收金额", { paid });
    }

    const total = toNumber(order.amountTotal);
    const paidAmount = paid - amount;
    const paymentStatus =
      paidAmount <= 0 ? "unpaid" : paidAmount >= total ? "paid" : "deposit_paid";
    const refundedAt = new Date().toISOString();

    const payment = await strapi.db.query(PAYMENT_UID).create({
      data: {
        paymentNo: generatePaymentNo(),
        orderNo: order.orderNo,
        orderId: order.id,
        channel: order.paymentMethod || "store_pay",
        amount: -amount,
        status: "refunded",
        idempotencyKey: `refund:${order.orderNo}:${amount}:${Date.now()}`,
        provider: "manual",
        operatorName: params.operatorName || null,
        operator: params.operatorId || null,
        refundedAmount: amount,
        refundNote: params.note || null,
        paidAt: refundedAt,
        note: "退款",
      },
    });

    await strapi.db.query(ORDER_UID).update({
      where: { id: order.id },
      data: { paidAmount, paymentStatus },
    });

    let rollback: any = null;
    if (paidAmount <= 0) {
      const referralService: any = strapi.service("plugin::zhao-tire.referral");
      await referralService.restoreUsedReward(order);
      rollback = await referralService.rollbackForOrder(order.orderNo);
      await strapi.db.query(ORDER_UID).update({
        where: { id: order.id },
        data: { rewardNo: null, rewardAmount: 0 },
      });
    }

    return {
      payment,
      order: { orderNo: order.orderNo, paidAmount, paymentStatus },
      rollback,
    };
  },
});
