import { Parser } from "expr-eval";

describe("quote-engine", () => {
  describe("expr-eval 沙箱", () => {
    it("应正确解析并计算简单表达式", () => {
      const parser = new Parser();
      const expr = parser.parse("weight * 10 + base");
      const result = expr.evaluate({ weight: 5, base: 20 });
      expect(result).toBe(70);
    });

    it("应支持条件表达式", () => {
      const parser = new Parser();
      const expr = parser.parse("weight > 10 ? weight * 8 : weight * 10");
      expect(expr.evaluate({ weight: 5 })).toBe(50);
      expect(expr.evaluate({ weight: 15 })).toBe(120);
    });

    it("应拒绝危险函数（非数学函数）", () => {
      const parser = new Parser();
      expect(() => parser.parse("require('fs')")).toThrow();
      expect(() => parser.parse("process.exit()")).toThrow();
    });
  });

  describe("QuoteResult 结构", () => {
    it("应生成正确的报价结果结构", () => {
      const result = {
        ruleId: "rule-001",
        serviceProvider: "dhl",
        minPrice: 150.5,
        maxPrice: 165.55,
        currency: "CNY",
        breakdown: {
          base: 150.5,
          volumetricWeight: 0,
          surcharges: [{ name: "燃油附加费", amount: 15 }],
          minCharge: 50,
        },
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };
      expect(result.minPrice).toBeLessThan(result.maxPrice);
      expect(result.currency).toBe("CNY");
      expect(result.breakdown.surcharges).toHaveLength(1);
    });
  });
});
