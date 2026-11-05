import wechatPayFactory, { WECHAT_PAY_ENV, maskOpenid } from "../../server/src/services/wechat-pay";

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
