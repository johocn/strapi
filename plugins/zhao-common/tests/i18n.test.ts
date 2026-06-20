import i18nFactory from "../server/src/services/i18n";

describe("i18n service", () => {
  const mockStrapi = {} as any;

  it("t() 应返回已知错误码的消息", () => {
    const i18n = i18nFactory({ strapi: mockStrapi });
    expect(i18n.t("COMMON_001")).toBe("未知错误");
    expect(i18n.t("CHANNEL_001", { channelId: 42 })).toBe("渠道不存在 (id=42)");
    expect(i18n.t("AUTH_001")).toBe("缺少认证令牌");
  });

  it("t() 应支持参数插值（单个）", () => {
    const i18n = i18nFactory({ strapi: mockStrapi });
    expect(i18n.t("COMMON_002", { reason: "email 为空" })).toBe("参数校验失败: email 为空");
  });

  it("t() 应支持多个参数插值", () => {
    const i18n = i18nFactory({ strapi: mockStrapi });
    expect(i18n.t("AUTH_003", { roles: "admin,owner" })).toBe("角色权限不足 (需要: admin,owner)");
  });

  it("t() 当未知 code 时应返回 code 本身", () => {
    const i18n = i18nFactory({ strapi: mockStrapi });
    expect(i18n.t("UNKNOWN_CODE")).toBe("UNKNOWN_CODE");
  });

  it("t() 当参数不匹配时应保留模板占位符", () => {
    const i18n = i18nFactory({ strapi: mockStrapi });
    const result = i18n.t("CHANNEL_001");
    expect(result).toBe("渠道不存在 (id={channelId})");
  });

  it("setMessages() 应覆盖现有消息", () => {
    const i18n = i18nFactory({ strapi: mockStrapi });
    i18n.setMessages({ COMMON_001: "自定义错误" });
    expect(i18n.t("COMMON_001")).toBe("自定义错误");
  });

  it("setMessages() 应追加新消息", () => {
    const i18n = i18nFactory({ strapi: mockStrapi });
    i18n.setMessages({ NEW_CODE: "新消息" });
    expect(i18n.t("NEW_CODE")).toBe("新消息");
  });

  it("setMessages() 不应影响未覆盖的消息", () => {
    const i18n = i18nFactory({ strapi: mockStrapi });
    i18n.setMessages({ COMMON_001: "override" });
    expect(i18n.t("CHANNEL_001", { channelId: 5 })).toBe("渠道不存在 (id=5)");
  });

  it("应处理所有渠道消息", () => {
    const i18n = i18nFactory({ strapi: mockStrapi });
    expect(i18n.t("CHANNEL_002")).toBe("渠道层级深度超限（最大 2 级）");
    expect(i18n.t("CHANNEL_003")).toBe("渠道已被禁用");
    expect(i18n.t("CHANNEL_004")).toBe("邀请码不存在或已过期");
    expect(i18n.t("CHANNEL_005")).toBe("成员不存在");
    expect(i18n.t("CHANNEL_006", { name: "test" })).toBe("渠道名已存在: test");
    expect(i18n.t("CHANNEL_007")).toBe("用户未关联渠道");
  });

  it("应处理所有认证消息", () => {
    const i18n = i18nFactory({ strapi: mockStrapi });
    expect(i18n.t("AUTH_001")).toBe("缺少认证令牌");
    expect(i18n.t("AUTH_002")).toBe("令牌无效或已过期");
    expect(i18n.t("AUTH_003", { roles: "admin" })).toBe("角色权限不足 (需要: admin)");
    expect(i18n.t("AUTH_004")).toBe("无权访问该渠道");
    expect(i18n.t("AUTH_005")).toBe("资源所有者不匹配");
  });
});