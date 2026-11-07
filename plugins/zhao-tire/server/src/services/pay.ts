import crypto from "crypto";
import type { Core } from "@strapi/strapi";

const ORDER_UID = "plugin::zhao-tire.tire-order";

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

/** 递归按键名排序后的稳定 JSON 序列化 */
export function canonicalize(value: any): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

export function signMockPayload(payload: any, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(canonicalize(payload))
    .digest("hex");
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  provider(): "mock" | "wechat" {
    const provider = String(process.env.PAY_PROVIDER || "mock").toLowerCase();
    return provider === "wechat" ? "wechat" : "mock";
  },

  mockSecret(): string {
    const secret = String(process.env.PAY_MOCK_SECRET || "tire-mock-local-secret");
    if (!process.env.PAY_MOCK_SECRET) {
      strapi.log.warn(
        "[zhao-tire] PAY_MOCK_SECRET 未配置，使用开发默认值（仅限 mock 通道）"
      );
    }
    return secret;
  },

  publicBase(): string {
    return String(process.env.PAY_PUBLIC_BASE || "https://www.joho.cn").replace(/\/$/, "");
  },

  /** 下单支付：创建 pending 流水并返回收银台参数（mock 或微信 JSAPI） */
  async prepay(payload: any) {
    const provider = this.provider();
    const orderNo = String(payload?.orderNo || "").trim();
    if (!orderNo) throwErr("VALIDATION_FAILED", 400, "orderNo 不能为空");

    const order = await strapi.db.query(ORDER_UID).findOne({ where: { orderNo } });
    if (!order) throwErr("ORDER_NOT_FOUND", 404, "订单不存在");

    // 归属校验：必须提供与订单一致的手机号，避免凭 orderNo 查询未结金额/发起支付
    const phone = String(payload?.phone || "").trim();
    if (!phone || phone !== String(order.phone || "").trim()) {
      throwErr("PHONE_MISMATCH", 403, "手机号与订单不匹配");
    }

    const paymentService: any = strapi.service("plugin::zhao-tire.payment");
    const outstanding = paymentService.outstandingOf(order);
    if (outstanding <= 0) {
      throwErr("ORDER_ALREADY_PAID", 400, "订单已结清，无需支付", {
        paymentStatus: order.paymentStatus,
      });
    }

    if (provider === "wechat") {
      const wechatPay: any = strapi.service("plugin::zhao-tire.wechat-pay");
      return wechatPay.prepay({
        order,
        amount: outstanding,
        openid: payload?.openid,
        idempotencyKey: payload?.idempotencyKey,
      });
    }

    const channel = payload?.channel === "pickup_pay" ? "pickup_pay" : "wechat";
    const idempotencyKey =
      String(payload?.idempotencyKey || "").trim() ||
      `prepay:${order.orderNo}:${channel}:${outstanding}`;

    const payment = await paymentService.ensurePending({
      order,
      amount: outstanding,
      channel,
      idempotencyKey,
      provider,
      externalNo: `MOCK-${Date.now()}`,
      raw: { provider, channel },
    });

    if (payment.status === "paid") {
      return { paid: true, paymentNo: payment.paymentNo, amount: payment.amount };
    }

    return {
      paymentNo: payment.paymentNo,
      amount: payment.amount,
      provider,
      mock: provider === "mock",
      payUrl: `${this.publicBase()}/tire/#/pages/pay/mock?paymentNo=${payment.paymentNo}`,
      orderNo: order.orderNo,
    };
  },

  /** 支付异步回调：mock 用 HMAC，微信走 APIv3 验签/解密；失败均不改单 */
  async notify(payload: any, signature: string, rawBody?: string, headers?: any) {
    if (this.provider() === "wechat") {
      const wechatPay: any = strapi.service("plugin::zhao-tire.wechat-pay");
      return wechatPay.notify({
        headers,
        rawBody: rawBody || JSON.stringify(payload || {}),
        body: payload,
      });
    }
    const sign = String(signature || "").trim();
    if (!sign) throwErr("INVALID_SIGNATURE", 401, "缺少 X-Mock-Sign 签名");

    const body = {
      paymentNo: String(payload?.paymentNo || ""),
      amount: toNumber(payload?.amount),
      externalNo: payload?.externalNo ? String(payload.externalNo) : undefined,
      status: payload?.status ? String(payload.status) : "paid",
    };
    if (!body.paymentNo) throwErr("VALIDATION_FAILED", 400, "paymentNo 不能为空");

    const expected = signMockPayload(
      {
        paymentNo: body.paymentNo,
        amount: body.amount,
        ...(body.externalNo ? { externalNo: body.externalNo } : {}),
        status: body.status,
      },
      this.mockSecret()
    );
    if (sign.length !== expected.length) {
      throwErr("INVALID_SIGNATURE", 401, "签名不匹配");
    }
    const valid = crypto.timingSafeEqual(
      Buffer.from(sign),
      Buffer.from(expected)
    );
    if (!valid) throwErr("INVALID_SIGNATURE", 401, "签名不匹配");

    if (body.status !== "paid") {
      throwErr("PAYMENT_STATE_INVALID", 400, "mock 回调仅支持 paid 状态");
    }

    const paymentService: any = strapi.service("plugin::zhao-tire.payment");
    const result = await paymentService.settle(body.paymentNo, {
      externalNo: body.externalNo || `MOCK-NOTIFY-${Date.now()}`,
      raw: { payload: body },
    });
    return { ok: true, duplicated: result.duplicated, paidAmount: result.order?.paidAmount };
  },

  /** H5 mock 收银台确认支付（仅 PAY_PROVIDER=mock 时可用） */
  async mockPay(paymentNo: string) {
    if (this.provider() !== "mock") {
      throwErr("PAY_PROVIDER_UNAVAILABLE", 501, "当前支付通道不支持模拟支付");
    }
    const paymentService: any = strapi.service("plugin::zhao-tire.payment");
    const result = await paymentService.settle(String(paymentNo || ""), {
      externalNo: `MOCK-H5-${Date.now()}`,
      raw: { source: "mock-h5" },
    });
    return { ok: true, duplicated: result.duplicated, paidAmount: result.order?.paidAmount };
  },
});
