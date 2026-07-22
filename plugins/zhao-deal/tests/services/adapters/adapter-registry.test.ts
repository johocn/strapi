import { AdapterRegistry } from "../../../server/src/services/adapters/adapter-registry";
import { MockAdapter } from "../../../server/src/services/adapters/adapter-mock";

describe("AdapterRegistry", () => {
  it("register + get 正常", () => {
    const reg = new AdapterRegistry();
    const mock = new MockAdapter();
    reg.register(mock);
    expect(reg.get("mock")).toBe(mock);
  });

  it("get 未注册的 platformCode 抛 DEAL_ADAPTER_NOT_FOUND", () => {
    const reg = new AdapterRegistry();
    try {
      reg.get("unknown");
      fail("应抛错");
    } catch (e: any) {
      expect(e.code).toBe("DEAL_ADAPTER_NOT_FOUND");
      expect(e.message).toContain("unknown");
    }
  });

  it("has 返回布尔值", () => {
    const reg = new AdapterRegistry();
    reg.register(new MockAdapter());
    expect(reg.has("mock")).toBe(true);
    expect(reg.has("taobao")).toBe(false);
  });

  it("list 返回已注册的 platformCode 列表", () => {
    const reg = new AdapterRegistry();
    reg.register(new MockAdapter());
    expect(reg.list()).toEqual(["mock"]);
  });
});
