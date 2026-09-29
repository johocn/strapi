import { stableJson, diffFields } from "../../server/src/services/utils/stable-json";

describe("stable-json", () => {
  test("键序不同 → 序列化结果一致", () => {
    expect(stableJson({ a: 1, b: 2 })).toBe(stableJson({ b: 2, a: 1 }));
  });

  test("嵌套数组/对象稳定序列化", () => {
    expect(stableJson({ x: [{ p: 1, q: 2 }] })).toBe('{"x":[{"p":1,"q":2}]}');
  });

  test("diffFields 只返回真正变化的字段", () => {
    const diff = diffFields({ name: "A", status: true }, { name: "B", status: true });
    expect(diff).toEqual({ name: { before: "A", after: "B" } });
  });

  test("diffFields 键序不同不产生 diff", () => {
    expect(diffFields({ a: 1, b: 2 }, { b: 2, a: 1 })).toEqual({});
  });

  test("diffFields 忽略主键与时间戳噪音字段", () => {
    expect(diffFields({ id: 1, updatedAt: "t1" }, { id: 2, updatedAt: "t2" })).toEqual({});
  });

  test("diffFields before 为空对象 → 全量记录为 after", () => {
    expect(diffFields({}, { name: "A" })).toEqual({ name: { before: null, after: "A" } });
  });
});