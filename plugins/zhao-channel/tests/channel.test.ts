/**
 * zhao-channel 渠道管理 API 测试
 *
 * 测试覆盖 Service 层方法（实际签名）：
 * channel.find(query)              → { data: channels[], pagination }
 * channel.findOne(id)              → { data: channel } | null
 * channel.create(data)             → { data: channel }
 * channel.update(id,data)          → { data: channel }
 * channel.delete(id)               → { data: { deletedChannels, ... } }
 * channel.createRoot({name,...})   → { id, name, code, ... }
 * channel.register({code,name,...})→ { id, name, code, ... }
 * channel.validateCode(code)       → { ok, valid, channel? }
 * channel.getNetwork(id)           → { channel, children } | null
 * channel.getHierarchy(id)         → { hierarchy: tree } | null
 * channel.getStats(id)             → { stats: {...} } | null
 * channel.getPublic(id)            → { id, name, ... } | null
 * -- 新增测试方法 --
 * channel.getAccessibleChannelIds(userId)          → number[]
 * channel.getChannelDistributionStats(channelId)   → { stats: {...} }
 */

import { setupStrapi, teardownStrapi, getStrapi } from "./helpers/strapi-setup";
import { seedTestData, cleanupTestData, TestFixtures } from "./fixtures/seed";

let fixtures: TestFixtures;

beforeAll(async () => {
  await setupStrapi();
  fixtures = await seedTestData(getStrapi());
});

afterAll(async () => {
  await cleanupTestData(getStrapi());
  await teardownStrapi();
});

// ==========================================
// 模块一：渠道管理 CRUD
// ==========================================
describe("渠道管理 CRUD (Service层)", () => {
  describe("find(query) — 查询渠道列表", () => {
    test("应返回分页渠道列表（默认分页）", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const result = await channelService.find({});
      expect(result).toBeTruthy();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(20);
    });

    test("应支持分页参数", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const result = await channelService.find({ page: 1, pageSize: 2 });
      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.pagination.pageSize).toBe(2);
    });

    test("应支持按 status 过滤", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const result = await channelService.find({ status: true });
      expect(result.data.every((c: any) => c.attributes.status === true)).toBe(true);
    });

    test("应支持按 channelTier 过滤", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const result = await channelService.find({ channelTier: "agent" });
      expect(result.data.every((c: any) => c.attributes.channelTier === "agent")).toBe(true);
    });
  });

  describe("findOne(id) — 查询单个渠道", () => {
    test("应返回渠道详情", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const result = await channelService.findOne(fixtures.channels[0].id);
      expect(result).toBeTruthy();
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe(fixtures.channels[0].id);
    });

    test("不存在的 ID 应返回 null", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const result = await channelService.findOne(99999);
      expect(result).toBeNull();
    });
  });

  describe("create(data) — 创建渠道", () => {
    test("应在根节点下创建一级渠道（regional）", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const result = await channelService.create({
        name: "测试区域代理",
        description: "测试创建",
        channelTier: "regional",
      });
      expect(result).toBeTruthy();
      expect(result.data.attributes.name).toBe("测试区域代理");
      expect(result.data.attributes.depth).toBe(0);
      expect(result.data.attributes.channelTier).toBe("regional");
    });

    test("应在父渠道下创建子渠道（store）", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const result = await channelService.create({
        name: "测试门店",
        description: "子渠道测试",
        channelTier: "store",
        parentChannel: fixtures.channels[0].id, // 总代 → 子渠道
      });
      expect(result).toBeTruthy();
      expect(result.data.attributes.parentChannelId).toEqual(
        expect.objectContaining({ id: fixtures.channels[0].id })
      );
    });

    // ---- 新增：层级深度超限测试 ----
    test("叶子节点下创建应抛出层级超限错误", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      // fixtures.channels[2] (门店A, store) 已是叶子节点，在其下创建应失败
      await expect(
        channelService.create({
          name: "超限渠道",
          parentChannel: fixtures.channels[2].id,
        })
      ).rejects.toThrow("渠道层级深度超限");
    });
  });

  describe("update(id, data) — 更新渠道", () => {
    test("应更新渠道名称", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const result = await channelService.update(fixtures.channels[3].id, {
        name: "已更新渠道名",
      });
      expect(result.data.attributes.name).toBe("已更新渠道名");
    });

    // ---- 新增：更新不存在的渠道应抛出错误 ----
    test("更新不存在的渠道应抛出错误", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      await expect(
        channelService.update(99999, { name: "不存在" })
      ).rejects.toThrow("渠道不存在");
    });
  });

  describe("delete(id) — 删除渠道", () => {
    test("应删除指定渠道并返回统计", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const result = await channelService.delete(fixtures.channels[3].id);
      expect(result).toBeTruthy();
      expect(result.data.deletedChannels).toBeGreaterThanOrEqual(1);
    });

    test("删除不存在的渠道应抛出错误", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      await expect(channelService.delete(99999)).rejects.toThrow("渠道不存在");
    });
  });
});

// ==========================================
// 模块二：渠道网络与操作
// ==========================================
describe("渠道网络与操作 (Service层)", () => {
  describe("createRoot(data) — 创建根渠道", () => {
    test("应创建 root 级别的根渠道", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const result = await channelService.createRoot({ name: "新总代" });
      expect(result).toBeTruthy();
      expect(result.depth).toBe(0);
      expect(result.channelTier).toBe("root");
    });
  });

  describe("register(data) — 通过邀请码注册子渠道", () => {
    test("有效邀请码应注册成功", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const parentCode = fixtures.channels[0].code;
      const result = await channelService.register({
        code: parentCode,
        name: "邀请注册新代理",
        channelTier: "agent",
      });
      expect(result).toBeTruthy();
      expect(result.depth).toBeGreaterThan(0);
    });

    test("禁用渠道的邀请码应注册失败", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const disabledCh = await strapi.db.query("plugin::zhao-channel.channel").create({
        data: {
          name: "测试禁用渠道",
          code: "TEST_DISABLED",
          slug: "test-disabled",
          channelTier: "agent",
          status: false,
          description: "测试用禁用渠道",
          path: "/0/",
          depth: 0,
        },
      });
      await strapi.db.query("plugin::zhao-channel.channel").update({
        where: { id: disabledCh.id },
        data: { path: `/${disabledCh.id}/` },
      });
      await expect(
        channelService.register({ code: "TEST_DISABLED", name: "失败门店" })
      ).rejects.toThrow("渠道已被禁用");
    });

    test("无效邀请码应抛出错误", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      await expect(
        channelService.register({ code: "INVALID123", name: "不存在的渠道" })
      ).rejects.toThrow("邀请码不存在或已过期");
    });
  });

  describe("validateCode(code) — 验证邀请码", () => {
    test("有效渠道码应返回 valid=true 和渠道信息", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const result = await channelService.validateCode(fixtures.channels[0].code);
      expect(result.ok).toBe(true);
      expect(result.valid).toBe(true);
      expect(result.channel).toBeDefined();
    });

    test("禁用渠道码应返回 valid=false", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const result = await channelService.validateCode(fixtures.channels[3].code);
      expect(result.ok).toBe(true);
      expect(result.valid).toBe(false);
    });
  });

  describe("getNetwork(id) — 获取渠道网络", () => {
    test("应返回渠道及其子渠道", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const result = await channelService.getNetwork(fixtures.channels[0].id);
      expect(result).toBeTruthy();
      expect(result.channel).toBeDefined();
      expect(Array.isArray(result.children)).toBe(true);
    });

    // ---- 新增：无子节点的渠道应返回空 children ----
    test("叶子渠道应返回空子节点列表", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const result = await channelService.getNetwork(fixtures.channels[2].id);
      expect(result).toBeTruthy();
      expect(Array.isArray(result.children)).toBe(true);
      expect(result.children.length).toBe(0);
    });
  });

  describe("getHierarchy(id) — 获取层级树", () => {
    test("应返回完整层级树", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const result = await channelService.getHierarchy(fixtures.channels[0].id);
      expect(result).toBeTruthy();
      expect(result.hierarchy).toBeDefined();
      expect(result.hierarchy.id).toBe(fixtures.channels[0].id);
    });
  });

  describe("getStats(id) — 获取渠道统计", () => {
    test("应返回渠道统计信息", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const result = await channelService.getStats(fixtures.channels[0].id);
      expect(result).toBeTruthy();
      expect(result.stats).toBeDefined();
      expect(result.stats.memberCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getPublic(id) — 获取公开信息", () => {
    test("应返回不包含敏感字段的公开信息", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const result = await channelService.getPublic(fixtures.channels[0].id);
      expect(result).toBeTruthy();
      expect(result.id).toBeDefined();
      expect(result.name).toBeDefined();
      expect((result as any).status).toBeUndefined();
      expect((result as any).code).toBeUndefined();
    });
  });

  // ========== 新增测试模块 ==========
  // ---- 新增：getAccessibleChannelIds ----
  describe("getAccessibleChannelIds(userId) — 获取用户可访问的渠道 ID 列表", () => {
    test("有渠道授权的用户应返回非空 ID 列表", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const result = await channelService.getAccessibleChannelIds(fixtures.users[0].id);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(typeof result[0]).toBe("number");
    });

    test("无授权的用户应返回空数组", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const noPermUser = await strapi.db.query("plugin::users-permissions.user").create({
        data: {
          username: "noperm_user",
          email: "noperm@channel-test.com",
          password: "$2a$10$testpasswordhashplaceholder123456",
          provider: "local",
          confirmed: true,
          blocked: false,
        },
      });
      await strapi.db.query("plugin::zhao-channel.channel-member").deleteMany({
        where: { user: noPermUser.id },
      });
      await strapi.db.query("plugin::zhao-channel.user-channel").deleteMany({
        where: { user: noPermUser.id },
      });
      const result = await channelService.getAccessibleChannelIds(noPermUser.id);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  // ---- 新增：getChannelDistributionStats ----
  describe("getChannelDistributionStats(channelId) — 获取渠道分销统计", () => {
    test("有成员的渠道应返回统计数据", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const result = await channelService.getChannelDistributionStats(fixtures.channels[0].id);
      expect(result).toBeTruthy();
      expect(result.stats).toBeDefined();
      expect(result.stats.id).toBe(fixtures.channels[0].id);
      expect(typeof result.stats.directCustomerCount).toBe("number");
    });

    test("不存在的渠道应返回 null", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const result = await channelService.getChannelDistributionStats(99999);
      expect(result).toBeNull();
    });
  });
});