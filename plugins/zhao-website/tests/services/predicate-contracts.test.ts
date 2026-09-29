import {
  getPredicateContract,
  validateObjectContract,
} from "../../server/src/services/utils/predicate-contracts";
import { isValidPredicate } from "../../server/src/services/utils/predicate-dictionary";

describe("predicate-contracts 契约表", () => {
  test("已登记契约可取出", () => {
    expect(getPredicateContract("DefinedTerm", "termCode")).toEqual(
      expect.objectContaining({ objectKinds: ["value"], maxLength: 60 })
    );
    expect(getPredicateContract("Organization", "url")).not.toBeNull();
    expect(getPredicateContract("Article", "cites")).toEqual({ objectKinds: ["citation"] });
  });

  test("未登记契约返回 null", () => {
    expect(getPredicateContract("Organization", "mentions")).toBeNull();
    expect(getPredicateContract("Unknown", "url")).toBeNull();
  });
});

describe("validateObjectContract", () => {
  const shape = (o: Partial<{ hasEntity: boolean; hasValue: boolean; hasText: boolean; textLength: number }>) => ({
    hasEntity: false, hasValue: false, hasText: false, textLength: 0, ...o,
  });

  test("未登记契约 → 放行（返回 null）", () => {
    expect(validateObjectContract("Organization", "mentions", shape({ hasText: true, textLength: 999 }))).toBeNull();
  });

  test("value 契约：objectValue 通过", () => {
    expect(validateObjectContract("DefinedTerm", "termCode", shape({ hasValue: true }))).toBeNull();
  });

  test("value 契约：objectText 超长 → 拒绝并给出原因", () => {
    const reason = validateObjectContract("DefinedTerm", "termCode", shape({ hasText: true, textLength: 300 }));
    expect(reason).toContain("超出上限 60");
  });

  test("value 契约：objectText 未超长 → 通过", () => {
    expect(validateObjectContract("Organization", "slogan", shape({ hasText: true, textLength: 12 }))).toBeNull();
  });

  test("value 契约：给 objectEntity  → 拒绝", () => {
    expect(validateObjectContract("DefinedTerm", "termCode", shape({ hasEntity: true }))).toContain("客体形态");
  });

  test("entity 契约：必须给 objectEntity", () => {
    expect(validateObjectContract("DefinedTerm", "inDefinedTermSet", shape({ hasEntity: true }))).toBeNull();
    expect(validateObjectContract("DefinedTerm", "inDefinedTermSet", shape({ hasValue: true, hasText: false }))).toContain("客体形态");
  });

  test("citation 契约：给 objectEntity 且绑定 truthPolicy → 通过", () => {
    expect(validateObjectContract("Article", "cites", shape({ hasEntity: true }), "truth-1")).toBeNull();
  });

  test("citation 契约：未绑定 truthPolicy → 拒绝", () => {
    expect(validateObjectContract("Article", "cites", shape({ hasEntity: true }))).toContain("truthPolicy");
  });
});

describe("字典补齐", () => {
  test("Organization.url / Article.cites / CreativeWork.cites 已入字典", () => {
    expect(isValidPredicate("Organization", "url")).toBe(true);
    expect(isValidPredicate("Article", "cites")).toBe(true);
    expect(isValidPredicate("CreativeWork", "cites")).toBe(true);
  });

  test("DefinedTerm.inDefinedTermSet 仍在字典内（术语集契约就位）", () => {
    expect(isValidPredicate("DefinedTerm", "inDefinedTermSet")).toBe(true);
  });
});