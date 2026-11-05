import crypto from "crypto";
import wechatPayFactory, {
  WECHAT_PAY_ENV,
  maskOpenid,
  readWechatPayConfig,
  verifyWechatNotifySignature,
} from "../../server/src/services/wechat-pay";

const ENV_KEYS = Object.values(WECHAT_PAY_ENV);

function setPrepayConfig() {
  process.env[WECHAT_PAY_ENV.appId] = "wx_test_appid";
  process.env[WECHAT_PAY_ENV.mchId] = "1107_test_mch";
  process.env[WECHAT_PAY_ENV.mchSerialNo] = "serial_test";
  process.env[WECHAT_PAY_ENV.privateKey] = "dummy-private-key";
}

function setNotifyConfig() {
  process.env[WECHAT_PAY_ENV.appId] = "wx_test_appid";
  process.env[WECHAT_PAY_ENV.mchId] = "1107_test_mch";
  process.env[WECHAT_PAY_ENV.apiV3Key] = "0123456789abcdef0123456789abcdef";
  process.env[WECHAT_PAY_ENV.platformPublicKey] = "dummy-public-key";
  process.env[WECHAT_PAY_ENV.notifyUrl] = "https://example.com/notify";
}

function createStrapi(overrides: { ensurePending?: jest.Mock; settle?: jest.Mock } = {}) {
  const updates: any[] = [];
  const ensurePending =
    overrides.ensurePending ||
    jest.fn(async (params: any) => ({
      id: 1,
      paymentNo: "PAY-TEST-1",
      amount: params.amount,
      status: "pending",
      externalNo: null,
      orderNo: params.order?.orderNo,
    }));
  const settle =
    overrides.settle || jest.fn(async () => ({ duplicated: true, order: { paidAmount: 100 } }));

  const strapi: any = {
    service(name: string) {
      if (name.endsWith(".payment")) {
        return { ensurePending, settle, outstandingOf: () => 100 };
      }
      if (name.endsWith(".wechat-pay")) {
        return strapi.__wechatPay;
      }
      return {};
    },
    db: {
      query(uid: string) {
        return {
          update: jest.fn(async (params: any) => {
            updates.push({ uid, ...params });
            return params.data;
          }),
          findOne: jest.fn(async () => ({ id: 9, paymentNo: "PAY-TEST-1", amount: 100, status: "paid" })),
        };
      },
    },
    log: { warn: jest.fn() },
    __updates: updates,
    __ensurePending: ensurePending,
    __settle: settle,
  };
  strapi.__wechatPay = wechatPayFactory({ strapi });
  return strapi;
}

beforeEach(() => {
  ENV_KEYS.forEach((key) => delete process.env[key]);
});

afterEach(() => {
  ENV_KEYS.forEach((key) => delete process.env[key]);
  jest.restoreAllMocks();
});

describe("wechat-pay prepay", () => {
  test("未配置商户密钥：返回可读错误且不落库", async () => {
    const strapi = createStrapi();
    const service: any = strapi.__wechatPay;

    await expect(
      service.prepay({ order: { id: 7, orderNo: "T-1" }, amount: 100, openid: "o-test-openid-1234" })
    ).rejects.toMatchObject({ code: "PAY_PROVIDER_NOT_CONFIGURED", status: 503 });

    expect(strapi.__ensurePending).not.toHaveBeenCalled();
    expect(strapi.__updates).toHaveLength(0);
  });

  test("已配置但缺少 openid：明确提示微信内登录，不落库", async () => {
    setPrepayConfig();
    const strapi = createStrapi();
    const service: any = strapi.__wechatPay;

    await expect(
      service.prepay({ order: { id: 7, orderNo: "T-1" }, amount: 100, openid: "" })
    ).rejects.toMatchObject({ code: "WECHAT_OPENID_REQUIRED", status: 400 });

    expect(strapi.__ensurePending).not.toHaveBeenCalled();
    expect(strapi.__updates).toHaveLength(0);
  });

  test("有 openid：透传 payerOpenid 并返回 JSAPI 参数", async () => {
    setPrepayConfig();
    const strapi = createStrapi();
    const service: any = strapi.__wechatPay;
    service.createJsapiTransaction = jest.fn(async () => "prepay_id_test");
    service.buildJsapiPayParams = jest.fn(() => ({
      appId: "wx_test_appid",
      timeStamp: "1",
      nonceStr: "n",
      package: "prepay_id=prepay_id_test",
      signType: "RSA",
      paySign: "s",
    }));

    const result = await service.prepay({
      order: { id: 7, orderNo: "T-1", wechatOpenid: null },
      amount: 100,
      openid: "o-test-openid-1234",
    });

    expect(strapi.__ensurePending).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "wechat",
        payerOpenid: "o-test-openid-1234",
      })
    );
    expect(result.payParams.package).toBe("prepay_id=prepay_id_test");
    expect(result.openidMasked).toBe(maskOpenid("o-test-openid-1234"));
    expect(strapi.__updates.some((item: any) => item.uid.includes("tire-payment"))).toBe(true);
    expect(strapi.__updates.some((item: any) => item.uid.includes("tire-order"))).toBe(true);
  });

  test("重复下单复用已有 prepay_id：不再次调用微信下单", async () => {
    setPrepayConfig();
    const strapi = createStrapi({
      ensurePending: jest.fn(async () => ({
        id: 1,
        paymentNo: "PAY-TEST-1",
        amount: 100,
        status: "pending",
        externalNo: "prepay_id_existing",
        orderNo: "T-1",
      })),
    });
    const service: any = strapi.__wechatPay;
    service.createJsapiTransaction = jest.fn(async () => "prepay_id_new");
    service.buildJsapiPayParams = jest.fn(() => ({ package: "prepay_id=prepay_id_existing" }));

    const result = await service.prepay({
      order: { id: 7, orderNo: "T-1", wechatOpenid: "o-test-openid-1234" },
      amount: 100,
      openid: "o-test-openid-1234",
    });

    expect(service.createJsapiTransaction).not.toHaveBeenCalled();
    expect(result.paymentNo).toBe("PAY-TEST-1");
    expect(result.payParams.package).toBe("prepay_id=prepay_id_existing");
  });
});

describe("wechat-pay 验签与配置", () => {
  test("回调默认地址指向 /pay/notify", () => {
    const config = readWechatPayConfig({ PAY_PUBLIC_BASE: "https://example.com" } as any);
    expect(config.notifyUrl).toBe("https://example.com/api/zhao-tire/v1/pay/notify");
  });

  test("原始报文签名：正确通过，篡改报文或缺失平台公钥均失败", () => {
    const pair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const config: any = {
      platformPublicKey: pair.publicKey.export({ type: "spki", format: "pem" }).toString(),
    };
    const timestamp = "1700000000";
    const nonce = "abc";
    const rawBody = '{"id":"x"}';
    const signature = crypto
      .sign("RSA-SHA256", Buffer.from(`${timestamp}\n${nonce}\n${rawBody}\n`), pair.privateKey)
      .toString("base64");

    expect(verifyWechatNotifySignature(config, { timestamp, nonce, rawBody, signature })).toBe(true);
    expect(
      verifyWechatNotifySignature(config, { timestamp, nonce, rawBody: `${rawBody} `, signature })
    ).toBe(false);
    expect(
      verifyWechatNotifySignature({ platformPublicKey: "" } as any, {
        timestamp,
        nonce,
        rawBody,
        signature,
      })
    ).toBe(false);
  });
});

describe("wechat-pay notify", () => {
  test("验签失败：抛错且不调用 settle（不改单）", async () => {
    setNotifyConfig();
    const strapi = createStrapi();
    const service: any = strapi.__wechatPay;
    service.verifySignature = jest.fn(() => false);

    await expect(
      service.notify({
        headers: {
          "wechatpay-timestamp": "1700000000",
          "wechatpay-nonce": "nonce",
          "wechatpay-signature": "bad-signature",
        },
        rawBody: "{}",
        body: { resource: { ciphertext: "x" } },
      })
    ).rejects.toMatchObject({ code: "INVALID_SIGNATURE", status: 401 });

    expect(strapi.__settle).not.toHaveBeenCalled();
    expect(strapi.__updates).toHaveLength(0);
  });

  test("验签通过但重放：settle 幂等返回 duplicated，不重复改单", async () => {
    setNotifyConfig();
    const strapi = createStrapi({
      settle: jest.fn(async () => ({ duplicated: true, order: { paidAmount: 100 } })),
    });
    const service: any = strapi.__wechatPay;
    service.verifySignature = jest.fn(() => true);
    service.decryptResource = jest.fn(() => ({
      appid: "wx_test_appid",
      mchid: "1107_test_mch",
      trade_state: "SUCCESS",
      out_trade_no: "PAY-TEST-1",
      transaction_id: "WX-TX-1",
      amount: { total: 100 },
    }));

    const params = {
      headers: {
        "wechatpay-timestamp": "1700000000",
        "wechatpay-nonce": "nonce",
        "wechatpay-signature": "ok",
      },
      rawBody: "{}",
      body: { resource: { ciphertext: "x" } },
    };

    const first = await service.notify(params);
    const second = await service.notify(params);

    expect(first.duplicated).toBe(true);
    expect(second.duplicated).toBe(true);
    expect(strapi.__settle).toHaveBeenCalledTimes(2);
    expect(strapi.__settle).toHaveBeenCalledWith(
      "PAY-TEST-1",
      expect.objectContaining({ externalNo: "WX-TX-1" })
    );
  });

  test("非 SUCCESS 状态：忽略且不改单", async () => {
    setNotifyConfig();
    const strapi = createStrapi();
    const service: any = strapi.__wechatPay;
    service.verifySignature = jest.fn(() => true);
    service.decryptResource = jest.fn(() => ({
      appid: "wx_test_appid",
      mchid: "1107_test_mch",
      trade_state: "NOTPAY",
    }));

    const result = await service.notify({
      headers: {
        "wechatpay-timestamp": "1700000000",
        "wechatpay-nonce": "nonce",
        "wechatpay-signature": "ok",
      },
      rawBody: "{}",
      body: { resource: { ciphertext: "x" } },
    });

    expect(result).toMatchObject({ ok: true, ignored: true });
    expect(strapi.__settle).not.toHaveBeenCalled();
  });
});

describe("wechat-pay refund 联动", () => {
  const originalFetch = (globalThis as any).fetch;

  function setRefundConfig() {
    const pair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    process.env[WECHAT_PAY_ENV.appId] = "wx_test_appid";
    process.env[WECHAT_PAY_ENV.mchId] = "1107_test_mch";
    process.env[WECHAT_PAY_ENV.mchSerialNo] = "serial_test";
    process.env[WECHAT_PAY_ENV.privateKey] = pair.privateKey
      .export({ type: "pkcs8", format: "pem" })
      .toString();
  }

  function createRefundStrapi(options: {
    payment?: any;
    existingRefund?: any;
    refund?: jest.Mock;
    order?: any;
  } = {}) {
    const updates: any[] = [];
    const payment = options.payment || {
      id: 11,
      paymentNo: "PAY-TEST-1",
      orderNo: "T-1",
      amount: 100,
      refundedAmount: 0,
      status: "paid",
      channel: "wechat",
    };
    const order = options.order || {
      id: 7,
      orderNo: "T-1",
      amountTotal: 100,
      paidAmount: 100,
      paymentStatus: "paid",
    };
    const refund =
      options.refund ||
      jest.fn(async () => ({
        duplicated: false,
        order: { orderNo: "T-1", paidAmount: 0, paymentStatus: "unpaid" },
        rollback: { rolledBack: true },
      }));

    const strapi: any = {
      service(name: string) {
        if (name.endsWith(".payment")) {
          return { findOrder: jest.fn(async () => order), refund };
        }
        if (name.endsWith(".wechat-pay")) return strapi.__wechatPay;
        return {};
      },
      db: {
        query(uid: string) {
          return {
            findOne: jest.fn(async ({ where }: any) => {
              if (where?.idempotencyKey) return options.existingRefund || null;
              return payment;
            }),
            update: jest.fn(async (params: any) => {
              updates.push({ uid, ...params });
              return params.data;
            }),
          };
        },
      },
      log: { warn: jest.fn() },
      __updates: updates,
      __refund: refund,
    };
    strapi.__wechatPay = wechatPayFactory({ strapi });
    return strapi;
  }

  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
  });

  test("受理成功后联动 payment.refund：回退订单金额并返回回滚结果", async () => {
    setRefundConfig();
    const strapi = createRefundStrapi();
    const service: any = strapi.__wechatPay;
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: "PROCESSING", refund_id: "WX-REF-1" }),
    }));
    (globalThis as any).fetch = fetchMock;

    const result = await service.refund({
      order: { orderNo: "T-1" },
      amount: 100,
      paymentNo: "PAY-TEST-1",
      refundNo: "REF-TEST",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/v3/refund/domestic/refunds");
    expect(strapi.__refund).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 100,
        sourcePaymentNo: "PAY-TEST-1",
        refundNo: "REF-TEST",
        provider: "wechat",
      })
    );
    expect(result).toMatchObject({
      refundNo: "REF-TEST",
      paymentNo: "PAY-TEST-1",
      duplicated: false,
      status: "PROCESSING",
      order: { orderNo: "T-1", paidAmount: 0, paymentStatus: "unpaid" },
      rollback: { rolledBack: true },
    });
  });

  test("同一退款号重放：不调用微信、不重复扣减", async () => {
    setRefundConfig();
    const fetchMock = jest.fn();
    (globalThis as any).fetch = fetchMock;
    const strapi = createRefundStrapi({
      existingRefund: {
        id: 101,
        idempotencyKey: "REF-TEST",
        refundedAmount: 100,
        status: "refunded",
      },
      order: { id: 7, orderNo: "T-1", paidAmount: 0, paymentStatus: "unpaid" },
    });
    const service: any = strapi.__wechatPay;

    const result = await service.refund({
      order: { orderNo: "T-1" },
      amount: 100,
      paymentNo: "PAY-TEST-1",
      refundNo: "REF-TEST",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(strapi.__refund).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      refundNo: "REF-TEST",
      duplicated: true,
      status: "DUPLICATED",
      order: { orderNo: "T-1", paidAmount: 0, paymentStatus: "unpaid" },
    });
  });

  test("超过来源流水可退余额：不调用微信、不改单", async () => {
    setRefundConfig();
    const fetchMock = jest.fn();
    (globalThis as any).fetch = fetchMock;
    const strapi = createRefundStrapi({
      payment: {
        id: 11,
        paymentNo: "PAY-TEST-1",
        orderNo: "T-1",
        amount: 100,
        refundedAmount: 60,
        status: "paid",
        channel: "wechat",
      },
    });
    const service: any = strapi.__wechatPay;

    await expect(
      service.refund({ order: { orderNo: "T-1" }, amount: 100, paymentNo: "PAY-TEST-1" })
    ).rejects.toMatchObject({
      code: "REFUND_EXCEEDED",
      status: 400,
      details: { refundable: 40, amount: 100 },
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(strapi.__refund).not.toHaveBeenCalled();
    expect(strapi.__updates).toHaveLength(0);
  });
});
