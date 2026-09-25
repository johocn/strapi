/**
 * sso-msg service 单元测试
 * 重点：模板存在但未配置 wx_template_id（生产常见态）时，任务必须落 failed 终态，
 * 绝不允许留下卡死 sending 的孤儿任务（会永久占死 dedupeKey）。
 */
const mockDb = {
  findOne: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const mockStrapi = {
  db: { query: () => mockDb },
  plugin: () => ({ service: () => ({ evaluate: async () => ({ allowed: true }) }) }),
  log: { warn: jest.fn(), info: jest.fn() },
};

import ssoMsgFactory from "../server/src/services/sso-msg";

// 注意：必须用 resetAllMocks 而非 clearAllMocks——后者不清空 mockResolvedValueOnce 队列，
// 会导致用例间残留排队值互相污染（表现为「单独跑绿、连跑才红」的偶发失败）。
describe("sso-msg sendJob", () => {
  beforeEach(() => jest.resetAllMocks());

  it("模板缺 wx_template_id 时任务落 failed 而非卡死 sending", async () => {
    const svc = ssoMsgFactory({ strapi: mockStrapi as any });
    mockDb.findOne
      // 第 1 次：sendJob 读 job（模板存在、openid 已解析、但模板无 wx_template_id）
      .mockResolvedValueOnce({
        id: 9,
        status: "pending",
        provider: "wechat",
        scene: "activity.promoted",
        toTarget: "openid_1",
        params: {},
        retryCount: 0,
        user: 5,
        version: null,
        template: { id: 3, code: "act_promoted", wxTemplateId: null, wxTemplateFields: [] },
      })
      // 第 2 次：getJob 回读
      .mockResolvedValueOnce({ id: 9, status: "failed" });

    const job = await svc.sendJob(9);

    const statuses = mockDb.update.mock.calls.map((c: any) => c[0]?.data?.status).filter(Boolean);
    expect(statuses).not.toContain("sending");
    expect(statuses).toContain("failed");
    expect((job as any).status).toBe("failed");
    expect(mockStrapi.log.warn).toHaveBeenCalled();
  });
});

describe("sso-msg buildJob", () => {
  beforeEach(() => jest.resetAllMocks());

  it("微信模板缺 wx_template_id 时拒绝落库", async () => {
    const svc = ssoMsgFactory({ strapi: mockStrapi as any });
    mockDb.findOne.mockResolvedValueOnce({
      id: 3,
      code: "act_before",
      isEnabled: true,
      provider: "wechat",
      wxTemplateId: null,
      wxTemplateFields: [],
    });
    mockDb.findMany.mockResolvedValue([]);

    await expect(
      svc.buildJob({ user: 5, scene: "activity.before", templateCode: "act_before" })
    ).rejects.toThrow(/微信模板ID|wx_template_id/);
    expect(mockDb.create).not.toHaveBeenCalled();
  });
});