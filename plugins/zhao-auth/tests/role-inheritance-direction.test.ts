import { ROLE_INHERITANCE, ROLE_HIERARCHY } from "../server/src/services/role-management.service";
import { getEffectiveRoles } from "../server/src/utils/permission-helpers";

describe("A1: ROLE_INHERITANCE 方向问题", () => {
  it("admin 应继承所有低权限角色", () => {
    expect(ROLE_INHERITANCE.admin).toContain("channel-admin");
    expect(ROLE_INHERITANCE.admin).toContain("plugin-manager");
    expect(ROLE_INHERITANCE.admin).toContain("instructor");
    expect(ROLE_INHERITANCE.admin).toContain("user");
  });

  it("user 不应继承任何高权限角色", () => {
    expect(ROLE_INHERITANCE.user).not.toContain("admin");
    expect(ROLE_INHERITANCE.user).not.toContain("channel-admin");
    expect(ROLE_INHERITANCE.user).not.toContain("plugin-manager");
    expect(ROLE_INHERITANCE.user).not.toContain("instructor");
  });

  it("user 的继承列表应为空", () => {
    expect(ROLE_INHERITANCE.user).toEqual([]);
  });

  it("getEffectiveRoles: user 角色不应获得 admin 权限", () => {
    const effectiveRoles = getEffectiveRoles(["user"]);
    expect(effectiveRoles).not.toContain("admin");
    expect(effectiveRoles).not.toContain("channel-admin");
  });

  it("getEffectiveRoles: admin 角色应获得所有低权限角色", () => {
    const effectiveRoles = getEffectiveRoles(["admin"]);
    expect(effectiveRoles).toContain("user");
    expect(effectiveRoles).toContain("instructor");
    expect(effectiveRoles).toContain("plugin-manager");
    expect(effectiveRoles).toContain("channel-admin");
  });

  it("ROLE_HIERARCHY: admin 权限值应最高", () => {
    expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY["channel-admin"]);
    expect(ROLE_HIERARCHY["channel-admin"]).toBeGreaterThan(ROLE_HIERARCHY["plugin-manager"]);
    expect(ROLE_HIERARCHY["plugin-manager"]).toBeGreaterThan(ROLE_HIERARCHY.instructor);
    expect(ROLE_HIERARCHY.instructor).toBeGreaterThan(ROLE_HIERARCHY.user);
  });
});
