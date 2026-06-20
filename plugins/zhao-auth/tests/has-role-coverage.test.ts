import createHasRole from "../server/src/policies/has-role";

describe("has-role - additional branches", () => {
  let strapi: any;

  beforeEach(() => {
    strapi = { log: { debug: jest.fn() } };
  });

  it("requiredRoles 不是数组时返回 FORBIDDEN_ROLE", () => {
    const hasRole = createHasRole(strapi);
    const result = hasRole({ user: { id: 1, roles: ["admin"] } }, { roles: "admin" });
    expect(result.passed).toBe(false);
    expect(result.code).toBe("FORBIDDEN_ROLE");
  });

  it("requiredRoles 包含非字符串时返回 FORBIDDEN_ROLE", () => {
    const hasRole = createHasRole(strapi);
    const result = hasRole({ user: { id: 1, roles: ["admin"] } }, { roles: [123] });
    expect(result.passed).toBe(false);
    expect(result.code).toBe("FORBIDDEN_ROLE");
  });

  it("user.roles 为字符串时提取为单元素数组", () => {
    const hasRole = createHasRole(strapi);
    const result = hasRole({ user: { id: 1, roles: "admin" } }, { roles: ["admin"] });
    expect(result.passed).toBe(true);
  });

  it("user.roles 为空字符串时返回 FORBIDDEN_ROLE", () => {
    const hasRole = createHasRole(strapi);
    const result = hasRole({ user: { id: 1, roles: "  " } }, { roles: ["admin"] });
    expect(result.passed).toBe(false);
    expect(result.code).toBe("FORBIDDEN_ROLE");
  });

  it("user.roles 对象中含 name 字段时提取", () => {
    const hasRole = createHasRole(strapi);
    const result = hasRole({ user: { id: 1, roles: [{ name: "admin" }] } }, { roles: ["admin"] });
    expect(result.passed).toBe(true);
  });

  it("user.roles 对象中无 type/name 时过滤掉", () => {
    const hasRole = createHasRole(strapi);
    const result = hasRole({ user: { id: 1, roles: [{ id: 5 }] } }, { roles: ["admin"] });
    expect(result.passed).toBe(false);
    expect(result.code).toBe("FORBIDDEN_ROLE");
  });
});
