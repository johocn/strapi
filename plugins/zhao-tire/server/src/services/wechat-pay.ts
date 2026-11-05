import crypto from "crypto";
import type { Core } from "@strapi/strapi";

const ORDER_UID = "plugin::zhao-tire.tire-order";
const PAYMENT_UID = "plugin::zhao-tire.tire-payment";

/** 环境变量键名（只读取，不落库、不打印值） */
export const WECHAT_PAY_ENV = {
  appId: "WECHAT_PAY_APPID",
  mchId: "WECHAT_PAY_MCHID",
  apiV3Key: "WECHAT_PAY_API_V3_KEY",
  mchSerialNo: "WECHAT_PAY_MCH_SERIAL_NO",
  privateKey: "WECHAT_PAY_PRIVATE_KEY",
  platformPublicKey: "WECHAT_PAY_PLATFORM_PUBLIC_KEY",
  notifyUrl: "WECHAT_PAY_NOTIFY_URL",
  apiBase: "WECHAT_PAY_API_BASE",
} as const;

export type WechatPayScope = "prepay" | "notify" | "refund";

export interface WechatPayConfig {
  appId: string;
  mchId: string;
  apiV3Key: string;
  mchSerialNo: string;
  privateKey: string;
  platformPublicKey: string;
  notifyUrl: string;
  apiBase: string;
}

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

function normalizePem(value?: string): string {
  return String(value || "").replace(/\\n/g, "\n").trim();
}

export function readWechatPayConfig(env: NodeJS.ProcessEnv = process.env): WechatPayConfig {
  const publicBase = String(env.PAY_PUBLIC_BASE || "https://www.joho.cn").replace(/\/$/, "");
  return {
    appId: String(env[WECHAT_PAY_ENV.appId] || "").trim(),
    mchId: String(env[WECHAT_PAY_ENV.mchId] || "").trim(),
    apiV3Key: String(env[WECHAT_PAY_ENV.apiV3Key] || "").trim(),
    mchSerialNo: String(env[WECHAT_PAY_ENV.mchSerialNo] || "").trim(),
    privateKey: normalizePem(env[WECHAT_PAY_ENV.privateKey]),
    platformPublicKey: normalizePem(env[WECHAT_PAY_ENV.platformPublicKey]),
    notifyUrl: String(
      env[WECHAT_PAY_ENV.notifyUrl] || `${publicBase}/api/zhao-tire/v1/pay/notify`
    ).trim(),
    apiBase: String(env[WECHAT_PAY_ENV.apiBase] || "https://api.mch.weixin.qq.com").replace(
      /\/$/,
      ""
    ),
  };
}

/** 返回缺失的环境变量名（只返回键名，便于运维补齐，不暴露值） */
export function missingWechatPayKeys(
  config: WechatPayConfig,
  scope: WechatPayScope = "prepay"
): string[] {
  const missing: string[] = [];
  if (!config.appId) missing.push(WECHAT_PAY_ENV.appId);
  if (!config.mchId) missing.push(WECHAT_PAY_ENV.mchId);
  if (scope === "notify") {
    if (!config.apiV3Key) missing.push(WECHAT_PAY_ENV.apiV3Key);
    if (!config.platformPublicKey) missing.push(WECHAT_PAY_ENV.platformPublicKey);
  } else {
    if (!config.mchSerialNo) missing.push(WECHAT_PAY_ENV.mchSerialNo);
    if (!config.privateKey) missing.push(WECHAT_PAY_ENV.privateKey);
  }
  if (scope !== "prepay" && !config.notifyUrl) missing.push(WECHAT_PAY_ENV.notifyUrl);
  return missing;
}

/** openid 掩码，仅用于日志与流水备注 */
export function maskOpenid(openid: string): string {
  const value = String(openid || "");
  if (value.length <= 10) return value ? `${value.slice(0, 2)}****` : "";
  return `${value.slice(0, 6)}****${value.slice(-4)}`;
}

/** APIv3 签名串：method\npath\ntimestamp\nnonce\nbody\n */
export function buildSignMessage(
  method: string,
  urlPath: string,
  timestamp: string,
  nonce: string,
  body: string
): string {
  return `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${body}\n`;
}

/** 商户私钥 RSA-SHA256 签名（base64） */
export function signWithPrivateKey(message: string, privateKey: string): string {
  return crypto.sign("RSA-SHA256", Buffer.from(message), privateKey).toString("base64");
}

/** 构造微信支付 APIv3 Authorization 头 */
export function buildAuthorizationHeader(
  config: WechatPayConfig,
  method: string,
  urlPath: string,
  body: string,
  timestamp: string = String(Math.floor(Date.now() / 1000)),
  nonce: string = crypto.randomBytes(16).toString("hex")
): string {
  const signature = signWithPrivateKey(
    buildSignMessage(method, urlPath, timestamp, nonce, body),
    config.privateKey
  );
  return (
    `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",` +
    `nonce_str="${nonce}",signature="${signature}",` +
    `timestamp="${timestamp}",serial_no="${config.mchSerialNo}"`
  );
}

/** 回调验签：timestamp\nnonce\nrawBody\n 与 wechatpay-signature 比对 */
export function verifyWechatNotifySignature(
  config: WechatPayConfig,
  params: { timestamp: string; nonce: string; rawBody: string; signature: string }
): boolean {
  const { timestamp, nonce, rawBody, signature } = params;
  if (!timestamp || !nonce || !signature || !config.platformPublicKey) return false;
  try {
    return crypto.verify(
      "RSA-SHA256",
      Buffer.from(`${timestamp}\n${nonce}\n${rawBody}\n`),
      config.platformPublicKey,
      Buffer.from(signature, "base64")
    );
  } catch {
    return false;
  }
}

/** 解密回调 resource（AEAD_AES_256_GCM） */
export function decryptWechatNotifyResource(
  config: WechatPayConfig,
  resource: any
): any {
  const key = Buffer.from(config.apiV3Key, "utf8");
  if (key.length !== 32) {
    throwErr("PAY_PROVIDER_NOT_CONFIGURED", 503, "微信支付 APIv3 密钥未配置或长度不正确");
  }
  const ciphertext = Buffer.from(String(resource?.ciphertext || ""), "base64");
  if (ciphertext.length <= 16) {
    throwErr("VALIDATION_FAILED", 400, "微信支付回调密文不合法");
  }
  const authTag = ciphertext.subarray(ciphertext.length - 16);
  const payload = ciphertext.subarray(0, ciphertext.length - 16);
  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(String(resource?.nonce || ""), "utf8")
    );
    decipher.setAuthTag(authTag);
    if (resource?.associated_data) {
      decipher.setAAD(Buffer.from(String(resource.associated_data), "utf8"));
    }
    const text = Buffer.concat([decipher.update(payload), decipher.final()]).toString("utf8");
    return JSON.parse(text);
  } catch {
    throwErr("VALIDATION_FAILED", 400, "微信支付回调解密失败");
  }
}

function readHeader(headers: any, name: string): string {
  if (!headers) return "";
  return String(headers[name] ?? headers[name.toLowerCase()] ?? "").trim();
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  readConfig(): WechatPayConfig {
    return readWechatPayConfig();
  },

  missingKeys(scope: WechatPayScope = "prepay"): string[] {
    return missingWechatPayKeys(this.readConfig(), scope);
  },

  /** 密钥缺失时返回可读错误，调用方在任何落库前调用 */
  assertConfigured(scope: WechatPayScope = "prepay"): WechatPayConfig {
    const config = this.readConfig();
    const missing = missingWechatPayKeys(config, scope);
    if (missing.length > 0) {
      throwErr(
        "PAY_PROVIDER_NOT_CONFIGURED",
        503,
        `微信支付暂未配置（缺少 ${missing.join("、")}），请联系门店`,
        { missingKeys: missing }
      );
    }
    return config;
  },

  buildJsapiPayParams(prepayId: string, config: WechatPayConfig) {
    const timeStamp = String(Math.floor(Date.now() / 1000));
    const nonceStr = crypto.randomBytes(16).toString("hex");
    const packageStr = `prepay_id=${prepayId}`;
    const paySign = signWithPrivateKey(
      `${config.appId}\n${timeStamp}\n${nonceStr}\n${packageStr}\n`,
      config.privateKey
    );
    return {
      appId: config.appId,
      timeStamp,
      nonceStr,
      package: packageStr,
      signType: "RSA",
      paySign,
    };
  },

  /** 调用 /v3/pay/transactions/jsapi；测试可覆盖本方法，避免真实网络请求 */
  async createJsapiTransaction(params: {
    config: WechatPayConfig;
    order: any;
    payment: any;
    amount: number;
    openid: string;
  }): Promise<string> {
    const { config, order, payment, amount, openid } = params;
    const urlPath = "/v3/pay/transactions/jsapi";
    const body = JSON.stringify({
      appid: config.appId,
      mchid: config.mchId,
      description: `雪地胎寄存-${order.orderNo}`.slice(0, 120),
      out_trade_no: payment.paymentNo,
      notify_url: config.notifyUrl,
      amount: { total: amount, currency: "CNY" },
      payer: { openid },
    });
    const fetchFn = (globalThis as any).fetch;
    if (typeof fetchFn !== "function") {
      throwErr("WECHAT_PREPAY_FAILED", 500, "当前运行环境缺少 fetch，无法请求微信支付");
    }
    const response = await fetchFn(`${config.apiBase}${urlPath}`, {
      method: "POST",
      headers: {
        Authorization: buildAuthorizationHeader(config, "POST", urlPath, body),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
    });
    const text = await response.text();
    let parsed: any = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = {};
    }
    if (!response.ok || !parsed?.prepay_id) {
      throwErr(
        "WECHAT_PREPAY_FAILED",
        502,
        `微信支付下单失败（${parsed?.code || response.status}）`,
        { status: response.status, code: parsed?.code, message: parsed?.message }
      );
    }
    return String(parsed.prepay_id);
  },

  /**
   * 微信 JSAPI 下单：
   * - 未配置 / 未绑定 openid 时在任何落库前报可读错误；
   * - 成功后创建/复用 pending 流水（同一幂等键不重复下单）；
   * - 流水 externalNo 存 prepay_id，便于重复点击复用。
   */
  async prepay(params: {
    order: any;
    amount: number;
    openid?: string;
    idempotencyKey?: string;
  }) {
    const config = this.assertConfigured("prepay");
    const order = params.order;
    const openid = String(params.openid || "").trim();
    if (!openid) {
      throwErr(
        "WECHAT_OPENID_REQUIRED",
        400,
        "当前账号未绑定微信，请在微信内打开并授权登录后重试"
      );
    }
    const amount = toNumber(params.amount);
    if (amount <= 0) {
      throwErr("AMOUNT_INVALID", 400, "支付金额必须大于 0");
    }

    const paymentService: any = strapi.service("plugin::zhao-tire.payment");
    const idempotencyKey =
      String(params.idempotencyKey || "").trim() ||
      `wechat:${order.orderNo}:${amount}:${maskOpenid(openid)}`;

    const payment = await paymentService.ensurePending({
      order,
      amount,
      channel: "wechat",
      idempotencyKey,
      provider: "wechat",
      payerOpenid: openid,
      raw: { provider: "wechat", openidMasked: maskOpenid(openid) },
    });

    if (payment.status === "paid") {
      return { paid: true, paymentNo: payment.paymentNo, amount: payment.amount };
    }

    let prepayId = String(payment.externalNo || "").trim();
    if (!prepayId) {
      prepayId = await this.createJsapiTransaction({
        config,
        order,
        payment,
        amount,
        openid,
      });
      await strapi.db.query(PAYMENT_UID).update({
        where: { id: payment.id },
        data: {
          externalNo: prepayId,
          raw: {
            provider: "wechat",
            openidMasked: maskOpenid(openid),
            prepayId,
          },
        },
      });
    }

    if (order?.id && !order.wechatOpenid) {
      await strapi.db.query(ORDER_UID).update({
        where: { id: order.id },
        data: { wechatOpenid: openid },
      });
    }

    return {
      paymentNo: payment.paymentNo,
      amount,
      provider: "wechat",
      mock: false,
      orderNo: order.orderNo,
      openidMasked: maskOpenid(openid),
      payParams: this.buildJsapiPayParams(prepayId, config),
    };
  },

  /** 微信支付异步回调：验签 + 解密 + 幂等 settle；任一步失败都不改单 */
  async notify(params: { headers: any; rawBody: string; body: any }) {
    const config = this.assertConfigured("notify");
    const headers = params.headers || {};
    const timestamp = readHeader(headers, "wechatpay-timestamp");
    const nonce = readHeader(headers, "wechatpay-nonce");
    const signature = readHeader(headers, "wechatpay-signature");
    if (!timestamp || !nonce || !signature) {
      throwErr("INVALID_SIGNATURE", 401, "缺少微信支付回调签名头");
    }

    const valid = this.verifySignature({
      config,
      timestamp,
      nonce,
      rawBody: String(params.rawBody || ""),
      signature,
    });
    if (!valid) throwErr("INVALID_SIGNATURE", 401, "微信支付回调验签失败");

    const resource = params.body?.resource;
    if (!resource) throwErr("VALIDATION_FAILED", 400, "回调缺少 resource");
    const decrypted = this.decryptResource(config, resource);

    if (String(decrypted?.mchid || "") !== config.mchId || String(decrypted?.appid || "") !== config.appId) {
      throwErr("INVALID_SIGNATURE", 401, "微信支付回调商户信息不匹配");
    }
    if (String(decrypted?.trade_state || "").toUpperCase() !== "SUCCESS") {
      return { ok: true, ignored: true, tradeState: String(decrypted?.trade_state || "") };
    }

    const paymentNo = String(decrypted?.out_trade_no || "").trim();
    if (!paymentNo) throwErr("VALIDATION_FAILED", 400, "回调缺少 out_trade_no");

    const paymentService: any = strapi.service("plugin::zhao-tire.payment");
    const result = await paymentService.settle(paymentNo, {
      externalNo: decrypted.transaction_id || undefined,
      raw: {
        source: "wechat-notify",
        tradeState: decrypted.trade_state,
        amount: decrypted.amount,
        transactionId: decrypted.transaction_id,
      },
    });
    return {
      ok: true,
      duplicated: result.duplicated,
      paidAmount: result.order?.paidAmount,
    };
  },

  verifySignature(params: {
    config: WechatPayConfig;
    timestamp: string;
    nonce: string;
    rawBody: string;
    signature: string;
  }): boolean {
    return verifyWechatNotifySignature(params.config, params);
  },

  decryptResource(config: WechatPayConfig, resource: any): any {
    return decryptWechatNotifyResource(config, resource);
  },

  /**
   * 微信退款骨架：只发起 APIv3 退款受理，不直接改订单状态。
   * 订单状态回滚仍交由 paymentService.refund 串联（下一轮接入）。
   */
  async refund(params: {
    order: any;
    amount: number;
    paymentNo: string;
    reason?: string;
  }) {
    const config = this.assertConfigured("refund");
    const amount = toNumber(params.amount);
    if (amount <= 0) throwErr("AMOUNT_INVALID", 400, "退款金额必须大于 0");

    const payment: any = await strapi.db.query(PAYMENT_UID).findOne({
      where: { paymentNo: String(params.paymentNo || "") },
    });
    if (!payment) throwErr("PAYMENT_NOT_FOUND", 404, "支付流水不存在");
    if (payment.status !== "paid") {
      throwErr("PAYMENT_STATE_INVALID", 400, "该流水当前状态不可退款", {
        status: payment.status,
      });
    }
    if (amount > toNumber(payment.amount)) {
      throwErr("REFUND_EXCEEDED", 400, "退款金额超过该笔支付金额", {
        paid: toNumber(payment.amount),
      });
    }

    const urlPath = "/v3/refund/domestic/refunds";
    const outRefundNo = `REF-${payment.paymentNo}-${Date.now()}`;
    const body = JSON.stringify({
      out_trade_no: payment.paymentNo,
      out_refund_no: outRefundNo,
      reason: String(params.reason || "雪地胎寄存退款").slice(0, 80),
      amount: { refund: amount, total: toNumber(payment.amount), currency: "CNY" },
    });
    const fetchFn = (globalThis as any).fetch;
    if (typeof fetchFn !== "function") {
      throwErr("WECHAT_PREPAY_FAILED", 500, "当前运行环境缺少 fetch，无法请求微信支付");
    }
    const response = await fetchFn(`${config.apiBase}${urlPath}`, {
      method: "POST",
      headers: {
        Authorization: buildAuthorizationHeader(config, "POST", urlPath, body),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
    });
    const text = await response.text();
    let parsed: any = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = {};
    }
    if (!response.ok) {
      throwErr(
        "PAY_PROVIDER_UNAVAILABLE",
        502,
        `微信退款受理失败（${parsed?.code || response.status}）`,
        { status: response.status, code: parsed?.code }
      );
    }
    return {
      refundNo: outRefundNo,
      paymentNo: payment.paymentNo,
      amount,
      status: String(parsed?.status || "PROCESSING"),
      orderNo: params.order?.orderNo || payment.orderNo,
    };
  },
});
