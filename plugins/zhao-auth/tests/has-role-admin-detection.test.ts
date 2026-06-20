import createHasRole from "../server/src/policies/has-role";

describe("A4: has-role admin 判断逻辑过于粗糙", () => {
  let strapi: any;

  beforeEach(() => {
    strapi = {
      log: {
        debug: jest.fn(),
      },
    };
  });

  it("roles[0] 为普通对象不应被当作 admin 放行", () => {
    const hasRole = createHasRole(strapi);

    const context = {
      user: {
        id: 1,
        roles: [{ name: "guest" }],
      },
    };

    const result = hasRole(context, { roles: ["admin"] });

    expect(result.passed).toBe(false);
    expect(result.code).toBe("FORBIDDEN_ROLE");
  });

  it("roles 中包含对象数组时，应提取角色名再匹配", () => {
    const hasRole = createHasRole(strapi);

    const context = {
      user: {
        id: 1,
        roles: [{ type: "instructor" }],
      },
    };

    const result = hasRole(context, { roles: ["instructor"] });

    expect(result.passed).toBe(true);
  });

  it("roles 中包含对象数组但不匹配所需角色时应拒绝", () => {
    const hasRole = createHasRole(strapi);

    const context = {
      user: {
        id: 1,
        roles: [{ type: "user" }],
      },
    };

    const result = hasRole(context, { roles: ["admin"] });

    expect(result.passed).toBe(false);
    expect(result.code).toBe("FORBIDDEN_ROLE");
  });
});
