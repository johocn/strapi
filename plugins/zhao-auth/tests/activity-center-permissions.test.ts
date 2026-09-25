import {
  PERMISSION_TREE,
  DEFAULT_ROLE_PERMISSIONS,
  MODULE_MANAGER_MAP,
  flattenPermissions,
} from "../server/src/permissions";

describe("活动中心权限树", () => {
  const all = flattenPermissions(PERMISSION_TREE);

  it("顶层节点 menu.activity-center 存在，且含活动/系列/资源三个子菜单", () => {
    expect(PERMISSION_TREE["menu.activity-center"]).toBeDefined();
    const children = Object.keys(PERMISSION_TREE["menu.activity-center"].children || {});
    expect(children).toEqual(
      expect.arrayContaining(["menu.activity", "menu.activity-series", "menu.activity-resource"])
    );
  });

  it("活动/系列/讲师场地的按钮权限点全部可授予", () => {
    for (const key of [
      "activity.read", "activity.create", "activity.update", "activity.delete",
      "series.read", "series.create", "series.update", "series.delete",
      "resource.read", "resource.write",
    ]) {
      expect(all).toContain(key);
    }
  });

  it("MODULE_MANAGER_MAP.activity 映射到 point-manager", () => {
    expect(MODULE_MANAGER_MAP.activity).toBe("point-manager");
  });

  it("point-manager 默认获得活动中心全部权限（含 delete）", () => {
    const mgr = DEFAULT_ROLE_PERMISSIONS["point-manager"] || [];
    expect(mgr).toContain("menu.activity-center");
    expect(mgr).toContain("activity.read");
    expect(mgr).toContain("activity.delete");
    expect(mgr).toContain("series.delete");
  });

  it("point-editor 默认获得活动中心权限但不含任何 delete", () => {
    const ed = DEFAULT_ROLE_PERMISSIONS["point-editor"] || [];
    expect(ed).toContain("menu.activity-center");
    expect(ed).toContain("activity.read");
    expect(ed).toContain("resource.write");
    expect(ed).not.toContain("activity.delete");
    expect(ed).not.toContain("series.delete");
  });
});