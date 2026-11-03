import { formatOrderNo, ORDER_NO_PATTERN } from "../../server/src/services/order-no";

describe("formatOrderNo", () => {
  it("生成 XT + 6 位日期 + 4 位序号", () => {
    const orderNo = formatOrderNo(new Date("2026-11-03T02:00:00Z"), 1);

    expect(orderNo).toBe("XT261103-0001");
    expect(ORDER_NO_PATTERN.test(orderNo)).toBe(true);
  });

  it("序号不足 4 位时补零", () => {
    expect(formatOrderNo(new Date("2026-11-03T02:00:00Z"), 12)).toBe(
      "XT261103-0012"
    );
  });

  it("四位序号保持原样", () => {
    expect(formatOrderNo(new Date("2026-11-03T02:00:00Z"), 9999)).toBe(
      "XT261103-9999"
    );
  });

  it("日期按 Asia/Shanghai 时区计算（UTC 16:00 已跨日）", () => {
    expect(formatOrderNo(new Date("2026-11-03T15:59:00Z"), 5)).toBe(
      "XT261103-0005"
    );
    expect(formatOrderNo(new Date("2026-11-03T16:00:00Z"), 5)).toBe(
      "XT261104-0005"
    );
  });
});
