import paymentFactory from "../../server/src/services/payment";

const ORDER_UID = "plugin::zhao-tire.tire-order";
const PAYMENT_UID = "plugin::zhao-tire.tire-payment";

function matches(row: any, where: any): boolean {
  return Object.entries(where || {}).every(([key, value]: [string, any]) => {
    if (value && typeof value === "object" && "$ne" in value) {
      return row[key] !== value.$ne;
    }
    return row[key] === value;
  });
}

function createStrapi(options: { order?: any; payments?: any[] } = {}) {
  const order = {
    id: 1,
    orderNo: "XT-1",
    amountTotal: 10000,
    paidAmount: 10000,
    paymentStatus: "paid",
    paymentMethod: "wechat",
    rewardNo: "RW-1",
    rewardAmount: 3000,
    phone: "13800000000",
    ...options.order,
  };
  const tables: Record<string, any[]> = {
    [ORDER_UID]: [order],
    [PAYMENT_UID]: (options.payments || [
      {
        id: 11,
        paymentNo: "PAY-1",
        orderNo: "XT-1",
        orderId: 1,
        channel: "wechat",
        amount: 10000,
        refundedAmount: 0,
        status: "paid",
        idempotencyKey: "wechat:XT-1:10000",
        provider: "wechat",
      },
    ]).map((row) => ({ ...row })),
  };

  let nextId = 100;
  const referral = {
    restoreUsedReward: jest.fn(async () => ({ rewardNo: "RW-1" })),
    rollbackForOrder: jest.fn(async () => ({
      rolledBack: true,
      completedCount: 2,
      pendingFreeCount: 0,
    })),
  };

  const strapi: any = {
    db: {
      query(uid: string) {
        const table = tables[uid] || (tables[uid] = []);
        return {
          findOne: jest.fn(async ({ where }: any) => table.find((row) => matches(row, where)) || null),
          findMany: jest.fn(async () => table),
          count: jest.fn(async () => table.length),
          create: jest.fn(async ({ data }: any) => {
            const row = { id: nextId++, ...data };
            table.push(row);
            return row;
          }),
          update: jest.fn(async ({ where, data }: any) => {
            const row = table.find((item) => matches(item, where));
            if (!row) return null;
            Object.assign(row, data);
            return row;
          }),
        };
      },
    },
    service(name: string) {
      if (name.endsWith(".referral")) return referral;
      return {};
    },
    log: { warn: jest.fn() },
    __tables: tables,
    __order: order,
    __payments: tables[PAYMENT_UID],
    __referral: referral,
  };
  strapi.__payment = paymentFactory({ strapi });
  return strapi;
}

describe("payment refund 联动", () => {
  test("全额退款：订单金额清零、来源流水置 refunded，并回滚邀请与奖励券", async () => {
    const strapi = createStrapi();
    const result = await strapi.__payment.refund({
      order: { orderNo: "XT-1" },
      amount: 10000,
      sourcePaymentNo: "PAY-1",
      refundNo: "REF-1",
    });

    expect(result.duplicated).toBe(false);
    expect(result.payment).toMatchObject({
      orderNo: "XT-1",
      amount: -10000,
      status: "refunded",
      refundedAmount: 10000,
      externalNo: "REF-1",
    });
    expect(result.sourcePayment).toMatchObject({
      paymentNo: "PAY-1",
      refundedAmount: 10000,
      status: "refunded",
    });
    expect(result.order).toEqual({
      orderNo: "XT-1",
      paidAmount: 0,
      paymentStatus: "unpaid",
    });

    expect(strapi.__order.paidAmount).toBe(0);
    expect(strapi.__order.paymentStatus).toBe("unpaid");
    expect(strapi.__order.rewardNo).toBeNull();
    expect(strapi.__order.rewardAmount).toBe(0);
    expect(strapi.__payments.find((row: any) => row.paymentNo === "PAY-1")).toMatchObject({
      refundedAmount: 10000,
      status: "refunded",
    });
    expect(strapi.__referral.restoreUsedReward).toHaveBeenCalledTimes(1);
    expect(strapi.__referral.rollbackForOrder).toHaveBeenCalledWith("XT-1");
    expect(result.rollback).toMatchObject({ rolledBack: true });
  });

  test("部分退款：订单保留剩余金额，来源流水保持 paid，不回滚邀请", async () => {
    const strapi = createStrapi();
    const result = await strapi.__payment.refund({
      order: { orderNo: "XT-1" },
      amount: 4000,
      sourcePaymentNo: "PAY-1",
      refundNo: "REF-2",
    });

    expect(result.order).toEqual({
      orderNo: "XT-1",
      paidAmount: 6000,
      paymentStatus: "deposit_paid",
    });
    expect(result.sourcePayment).toMatchObject({
      refundedAmount: 4000,
      status: "paid",
    });
    expect(strapi.__order.rewardNo).toBe("RW-1");
    expect(strapi.__referral.restoreUsedReward).not.toHaveBeenCalled();
    expect(strapi.__referral.rollbackForOrder).not.toHaveBeenCalled();
  });

  test("超额退款被拒：超过订单已收金额不落库", async () => {
    const strapi = createStrapi();
    const paymentCount = strapi.__payments.length;

    await expect(
      strapi.__payment.refund({ order: { orderNo: "XT-1" }, amount: 10001 })
    ).rejects.toMatchObject({ code: "REFUND_EXCEEDED", status: 400 });

    expect(strapi.__payments).toHaveLength(paymentCount);
    expect(strapi.__order.paidAmount).toBe(10000);
    expect(strapi.__referral.restoreUsedReward).not.toHaveBeenCalled();
  });

  test("超额退款被拒：超过来源流水可退余额不调用退款", async () => {
    const strapi = createStrapi({
      payments: [
        {
          id: 11,
          paymentNo: "PAY-1",
          orderNo: "XT-1",
          channel: "wechat",
          amount: 10000,
          refundedAmount: 6000,
          status: "paid",
          idempotencyKey: "wechat:XT-1:10000",
        },
      ],
    });

    await expect(
      strapi.__payment.refund({
        order: { orderNo: "XT-1" },
        amount: 5000,
        sourcePaymentNo: "PAY-1",
      })
    ).rejects.toMatchObject({
      code: "REFUND_EXCEEDED",
      status: 400,
      details: { refundable: 4000, amount: 5000 },
    });
  });

  test("重复退款幂等：同一退款号只扣减一次", async () => {
    const strapi = createStrapi();
    const params = {
      order: { orderNo: "XT-1" },
      amount: 4000,
      sourcePaymentNo: "PAY-1",
      refundNo: "REF-3",
    };

    const first = await strapi.__payment.refund(params);
    const second = await strapi.__payment.refund(params);

    expect(first.duplicated).toBe(false);
    expect(second.duplicated).toBe(true);
    expect(second.payment.paymentNo).toBe(first.payment.paymentNo);
    expect(strapi.__order.paidAmount).toBe(6000);
    expect(
      strapi.__payments.filter((row: any) => row.idempotencyKey === "REF-3")
    ).toHaveLength(1);
    expect(
      strapi.__payments.find((row: any) => row.paymentNo === "PAY-1")
    ).toMatchObject({ refundedAmount: 4000, status: "paid" });
  });
});
