import { TaobaoAdapter } from "../../../server/src/services/adapters/taobao-adapter";
import { PddAdapter } from "../../../server/src/services/adapters/pdd-adapter";
import { DouyinAdapter } from "../../../server/src/services/adapters/douyin-adapter";
import { JdAdapter } from "../../../server/src/services/adapters/jd-adapter";
import { MockAdapter } from "../../../server/src/services/adapters/adapter-mock";

const config = { appKey: "k", appSecret: "s", apiEndpoint: "https://api" };

describe("4 个平台 Adapter 骨架", () => {
  it("TaobaoAdapter.platformCode = taobao", () => {
    expect(new TaobaoAdapter(config).platformCode).toBe("taobao");
  });
  it("PddAdapter.platformCode = pdd", () => {
    expect(new PddAdapter(config).platformCode).toBe("pdd");
  });
  it("DouyinAdapter.platformCode = douyin", () => {
    expect(new DouyinAdapter(config).platformCode).toBe("douyin");
  });
  it("JdAdapter.platformCode = jd", () => {
    expect(new JdAdapter(config).platformCode).toBe("jd");
  });

  it("骨架 fetchCoupons 返回空列表", async () => {
    const a = new TaobaoAdapter(config);
    const r = await a.fetchCoupons({ pageSize: 10, pageNo: 1 });
    expect(r.list).toEqual([]);
    expect(r.hasNext).toBe(false);
  });

  it("骨架 transformLink 返回原始链接 + promoChannelId 作为 promoPid", async () => {
    const a = new TaobaoAdapter(config);
    const r = await a.transformLink({ promoLink: "https://x", promoChannelId: "adzone_001" });
    expect(r.resolvedLink).toBe("https://x");
    expect(r.promoPid).toBe("adzone_001");
  });
});

describe("MockAdapter", () => {
  it("返回注入的测试数据并正确分页", async () => {
    const mock = new MockAdapter();
    mock.setMockData(
      [{ couponId: "c1", amountDesc: "满 100 减 20", promoLink: "l1" }],
      [],
      []
    );
    const r = await mock.fetchCoupons({ pageSize: 10, pageNo: 1 });
    expect(r.list).toHaveLength(1);
    expect(r.total).toBe(1);
  });

  it("transformLink 注入 pid 参数", async () => {
    const mock = new MockAdapter();
    const r = await mock.transformLink({ promoLink: "https://x", promoChannelId: "p1" });
    expect(r.resolvedLink).toContain("pid=p1");
    expect(r.promoPid).toBe("p1");
  });
});
