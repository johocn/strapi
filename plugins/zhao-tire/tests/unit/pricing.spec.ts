import { calcPrice } from "../../server/src/services/pricing";

const packageDoc = {
  baseMonths: 6,
  storePrice: 120000,
  pickupPrice: 160000,
  extraMonthPrice: 20000,
};

describe("calcPrice", () => {
  it("未超基础存期按到店价收取，不加收超期月费", () => {
    const result = calcPrice({
      serviceType: "store",
      months: 6,
      packageDoc,
      addons: [],
    });

    expect(result).toEqual({
      amountPackage: 120000,
      amountAddon: 0,
      amountTotal: 120000,
    });
  });

  it("超出基础存期按月单价追加，上门服务取上门价", () => {
    const result = calcPrice({
      serviceType: "pickup",
      months: 9,
      packageDoc,
      addons: [],
    });

    expect(result.amountPackage).toBe(160000 + 3 * 20000);
    expect(result.amountAddon).toBe(0);
    expect(result.amountTotal).toBe(220000);
  });

  it("增值项价格叠加到套餐金额之上", () => {
    const result = calcPrice({
      serviceType: "store",
      months: 7,
      packageDoc,
      addons: [{ price: 30000 }, { price: 20000 }],
    });

    expect(result).toEqual({
      amountPackage: 120000 + 20000,
      amountAddon: 50000,
      amountTotal: 140000 + 50000,
    });
  });

  it("存期低于基础月数时仍按基础价收取", () => {
    const result = calcPrice({
      serviceType: "store",
      months: 2,
      packageDoc,
      addons: [],
    });

    expect(result.amountPackage).toBe(120000);
    expect(result.amountTotal).toBe(120000);
  });
});
