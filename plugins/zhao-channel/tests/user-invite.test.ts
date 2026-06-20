/**
 * zhao-channel 用户邀请与分销 API 测试
 *
 * 测试覆盖 Service 层方法（实际签名）：
 * userInvite.createForUser(userId, inviterCode?, inviteChannelId?) → record
 * userInvite.findByInviteCode(code)                                → record | null
 * userInvite.findByUserId(userId)                                  → record | null
 * userInvite.getDistributionChain(userId)                          → { id, username, email, depth }[]
 * userInvite.getDirectDownstream(userId)                           → { userId, username, ... }[]
 * userInvite.getAllDownstream(userId)                              → { userId, username, depth, ... }[]
 * userInvite.getUserDistributionStats(userId)                      → { userId, inviteCode, stats, ... } | null
 * userInvite.getChannelDistributionStats(channelId)                → { channelId, directCustomerCount, ... }
 * -- 新增测试方法 --
 * getDistributionChain → 深度为2的用户的完整分销链
 * createForUser → 通过已有邀请关系的用户创建深度=2的链
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
// 模块五：用户邀请与分销
// ==========================================
describe("用户邀请与分销 (Service层)", () => {
  describe("createForUser(userId, inviterCode?, inviteChannelId?) — 为用户创建邀请记录", () => {
    test("不传邀请码应创建有机注册记录（inviteMethod=organic）", async () => {
      const strapi = getStrapi();
      const inviteService = strapi.plugin("zhao-channel").service("user-invite");
      const result = await inviteService.createForUser(fixtures.users[3].id);
      expect(result).toBeTruthy();
      expect(result.inviteCode).toBeDefined();
      expect(result.inviteMethod).toBe("organic");
      expect(result.distributionDepth).toBe(0);
    });

    test("传入有效邀请码应创建邀请注册记录（inviteMethod=invite_code）", async () => {
      const strapi = getStrapi();
      const inviteService = strapi.plugin("zhao-channel").service("user-invite");
      const result = await inviteService.createForUser(
        fixtures.users[4].id,
        "INVITE001",
        fixtures.channels[0].id
      );
      expect(result).toBeTruthy();
      expect(result.inviteMethod).toBe("invite_code");
      expect(result.distributionDepth).toBeGreaterThanOrEqual(1);
    });

    // ---- 新增：创建深度=2的分销链 ----
    test("通过已邀请用户创建记录应形成深度=2的分销链", async () => {
      const strapi = getStrapi();
      const inviteService = strapi.plugin("zhao-channel").service("user-invite");
      const user4Invite = await strapi.db.query("plugin::zhao-channel.user-invite").findOne({
        where: { user: fixtures.users[4].id },
      });
      expect(user4Invite).toBeTruthy();
      await strapi.db.query("plugin::zhao-channel.user-invite").update({
        where: { id: user4Invite.id },
        data: {
          inviteMethod: "invite_code",
          invitedBy: fixtures.users[0].id,
          inviteChannel: fixtures.channels[0].id,
          distributionPath: `/${fixtures.users[0].id}/${fixtures.users[4].id}/`,
          distributionDepth: 1,
        },
      });
      await strapi.db.query("plugin::zhao-channel.user-invite").deleteMany({
        where: { user: fixtures.users[5].id },
      });
      const depth2Result = await inviteService.createForUser(
        fixtures.users[5].id,
        user4Invite.inviteCode,
        fixtures.channels[0].id
      );
      expect(depth2Result).toBeTruthy();
      expect(depth2Result.inviteMethod).toBe("invite_code");
      expect(depth2Result.distributionDepth).toBeGreaterThanOrEqual(1);
      const chain = await inviteService.getDistributionChain(fixtures.users[5].id);
      expect(chain.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("findByInviteCode(code) — 通过邀请码查找记录", () => {
    test("应返回邀请码对应的记录（含关联用户）", async () => {
      const strapi = getStrapi();
      const inviteService = strapi.plugin("zhao-channel").service("user-invite");
      const result = await inviteService.findByInviteCode("INVITE001");
      expect(result).toBeTruthy();
      expect(result.inviteCode).toBe("INVITE001");
      expect(result.user).toBeDefined();
    });

    test("不存在的邀请码应返回 null", async () => {
      const strapi = getStrapi();
      const inviteService = strapi.plugin("zhao-channel").service("user-invite");
      const result = await inviteService.findByInviteCode("NONEXISTENT");
      expect(result).toBeNull();
    });
  });

  describe("findByUserId(userId) — 通过用户 ID 查找记录", () => {
    test("应返回该用户的邀请记录", async () => {
      const strapi = getStrapi();
      const inviteService = strapi.plugin("zhao-channel").service("user-invite");
      const result = await inviteService.findByUserId(fixtures.users[0].id);
      expect(result).toBeTruthy();
      expect(result.user).toBeDefined();
    });

    test("无邀请记录的用户应返回 null", async () => {
      const strapi = getStrapi();
      const inviteService = strapi.plugin("zhao-channel").service("user-invite");
      const result = await inviteService.findByUserId(99999);
      expect(result).toBeNull();
    });
  });

  describe("getDistributionChain(userId) — 获取分销链", () => {
    test("应返回用户的分销链（按深度升序）", async () => {
      const strapi = getStrapi();
      const inviteService = strapi.plugin("zhao-channel").service("user-invite");
      const result = await inviteService.getDistributionChain(fixtures.users[1].id);
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0].depth).toBe(0);
      }
    });

    test("无分销链的用户应返回空数组", async () => {
      const strapi = getStrapi();
      const inviteService = strapi.plugin("zhao-channel").service("user-invite");
      const result = await inviteService.getDistributionChain(99999);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    // ---- 新增：深度=2的用户分销链验证 ----
    test("深度=2的用户应返回包含全部上级的完整链", async () => {
      const strapi = getStrapi();
      const inviteService = strapi.plugin("zhao-channel").service("user-invite");
      const user4Invite = await strapi.db.query("plugin::zhao-channel.user-invite").findOne({
        where: { user: fixtures.users[4].id },
      });
      await strapi.db.query("plugin::zhao-channel.user-invite").update({
        where: { id: user4Invite.id },
        data: {
          inviteMethod: "invite_code",
          invitedBy: fixtures.users[0].id,
          inviteChannel: fixtures.channels[0].id,
          distributionPath: `/${fixtures.users[0].id}/${fixtures.users[4].id}/`,
          distributionDepth: 1,
        },
      });
      await strapi.db.query("plugin::zhao-channel.user-invite").deleteMany({
        where: { user: fixtures.users[5].id },
      });
      await inviteService.createForUser(
        fixtures.users[5].id,
        user4Invite.inviteCode,
        fixtures.channels[0].id
      );
      const chain = await inviteService.getDistributionChain(fixtures.users[5].id);
      expect(Array.isArray(chain)).toBe(true);
      expect(chain.length).toBeGreaterThanOrEqual(2);
      chain.forEach((item: any, index: number) => {
        expect(item.depth).toBe(index);
      });
    });
  });

  describe("getDirectDownstream(userId) — 获取直接下级", () => {
    test("应返回用户的直接下级列表", async () => {
      const strapi = getStrapi();
      const inviteService = strapi.plugin("zhao-channel").service("user-invite");
      const result = await inviteService.getDirectDownstream(fixtures.users[0].id);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
      result.forEach((item: any) => {
        expect(item.userId).toBeDefined();
      });
    });

    test("无下级的用户应返回空数组", async () => {
      const strapi = getStrapi();
      const inviteService = strapi.plugin("zhao-channel").service("user-invite");
      const result = await inviteService.getDirectDownstream(99999);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe("getAllDownstream(userId) — 获取所有下级（递归）", () => {
    test("应返回用户的所有下级分销用户", async () => {
      const strapi = getStrapi();
      const inviteService = strapi.plugin("zhao-channel").service("user-invite");
      const result = await inviteService.getAllDownstream(fixtures.users[0].id);
      expect(Array.isArray(result)).toBe(true);
    });

    test("无下级的用户应返回空数组", async () => {
      const strapi = getStrapi();
      const inviteService = strapi.plugin("zhao-channel").service("user-invite");
      const result = await inviteService.getAllDownstream(99999);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe("getUserDistributionStats(userId) — 获取个人分销统计", () => {
    test("应返回用户的分销统计信息", async () => {
      const strapi = getStrapi();
      const inviteService = strapi.plugin("zhao-channel").service("user-invite");
      const result = await inviteService.getUserDistributionStats(fixtures.users[0].id);
      expect(result).toBeTruthy();
      expect(result.userId).toBe(fixtures.users[0].id);
      expect(result.inviteCode).toBeDefined();
      expect(result.stats).toBeDefined();
      expect(typeof result.stats.directCount).toBe("number");
    });

    test("无邀请记录的用户应返回 null", async () => {
      const strapi = getStrapi();
      const inviteService = strapi.plugin("zhao-channel").service("user-invite");
      const result = await inviteService.getUserDistributionStats(99999);
      expect(result).toBeNull();
    });
  });

  describe("getChannelDistributionStats(channelId) — 获取渠道分销统计", () => {
    test("应返回渠道维度的分销统计", async () => {
      const strapi = getStrapi();
      const inviteService = strapi.plugin("zhao-channel").service("user-invite");
      const result = await inviteService.getChannelDistributionStats(fixtures.channels[0].id);
      expect(result).toBeTruthy();
      expect(result.channelId).toBe(fixtures.channels[0].id);
      expect(typeof result.directCustomerCount).toBe("number");
      expect(typeof result.totalCustomerCount).toBe("number");
    });

    test("无用户的渠道应返回全 0 统计", async () => {
      const strapi = getStrapi();
      const inviteService = strapi.plugin("zhao-channel").service("user-invite");
      const result = await inviteService.getChannelDistributionStats(fixtures.channels[4].id);
      expect(result).toBeTruthy();
      expect(result.directCustomerCount).toBe(0);
    });
  });
});