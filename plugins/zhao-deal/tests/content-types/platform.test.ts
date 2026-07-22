import schema from "../../server/src/content-types/platform/schema.json";

describe("Platform content-type", () => {
  it("code 字段为枚举且包含 4 个平台", () => {
    const codeAttr = schema.attributes.code as any;
    expect(codeAttr.type).toBe("enumeration");
    expect(codeAttr.enum).toEqual(["taobao", "pdd", "douyin", "jd"]);
    expect(codeAttr.required).toBe(true);
    expect(codeAttr.unique).toBe(true);
  });

  it("appSecret 使用 password 类型", () => {
    expect((schema.attributes.appSecret as any).type).toBe("password");
  });

  it("syncMode 默认 manual", () => {
    expect((schema.attributes.syncMode as any).default).toBe("manual");
  });

  it("fetchConfig 为 json 类型", () => {
    expect((schema.attributes.fetchConfig as any).type).toBe("json");
  });
});
