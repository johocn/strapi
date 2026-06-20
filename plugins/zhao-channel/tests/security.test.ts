/**
 * zhao-channel 安全与权限测试
 *
 * 测试覆盖：
 * 1. Service 层输入验证风险
 * 2. 异常处理与错误信息泄露
 * 3. 无效 ID/不存在记录的健壮性
 * 4. 边界条件（空数组、超大数值、注入字符串等）
 * 5. 并发/幂等场景
 * 6. 跨渠道隔离检查（用户不能操作其他渠道的资源）
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
// 模块七：安全与异常边界
// ==========================================
describe("安全与异常处理", () => {
  // ---------- 1. 无效数据输入 ----------
  describe("无效数据输入", () => {
    test("create — 空名称应优雅处理", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      await expect(
        channelService.create({ name: "", channelTier: "store" })
      ).rejects.toThrow();
    });

    test("create — 无效层级应抛出错误", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      await expect(
        channelService.create({
          name: "无效层级渠道",
          channelTier: "invalid_tier",
        })
      ).rejects.toThrow();
    });

    test("create — XSS 字符串应转义或阻止", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      await expect(
        channelService.create({
          name: '<script>alert("xss")</script>',
          channelTier: "store",
        })
      ).rejects.toThrow();
    });
  });

  // ---------- 2. 不存在 ID / 恶意查询 ----------
  describe("不存在资源", () => {
    test("findOne — 不存在 ID 应返回 null", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const result = await channelService.findOne(99999);
      expect(result).toBeNull();
    });

    test("validateCode — 不存在 Code 应返回 valid=false", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const result = await channelService.validateCode("NONEXISTENT_CODE_12345");
      expect(result.valid).toBe(false);
    });

    test("update — 更新不存在渠道应抛出错误", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      await expect(
        channelService.update(99999, { name: "无名渠道" })
      ).rejects.toThrow();
    });

    test("delete — 删除不存在渠道应抛出错误", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      await expect(
        channelService.delete(99999)
      ).rejects.toThrow();
    });

    test("removeMember — 从不存在渠道移除成员应优雅处理", async () => {
      const strapi = getStrapi();
      const memberService = strapi.plugin("zhao-channel").service("channel-member");
      await expect(
        memberService.removeMember(99999, fixtures.users[0].id)
      ).rejects.not.toBeNull();
    });
  });

  // ---------- 3. 空数组 / 边界条件 ----------
  describe("边界条件", () => {
    test("grantChannelsToUser — 空渠道 ID 数组应返回 granted=0", async () => {
      const strapi = getStrapi();
      const permService = strapi.plugin("zhao-channel").service("channel-permission");
      const result = await permService.grantChannelsToUser(
        fixtures.users[0].id,
        [],
        fixtures.users[0].id
      );
      expect(result.granted).toBe(0);
    });

    test("batchGrantAsync — 空渠道数组应优雅处理", async () => {
      const strapi = getStrapi();
      const permService = strapi.plugin("zhao-channel").service("channel-permission");
      const result = await permService.batchGrantAsync(
        "user",
        fixtures.users[0].id,
        [],
        fixtures.users[0].id
      );
      expect(result).toBeTruthy();
      expect(typeof result.jobId).toBe("string");
    });

    test("inviteMember — 空邮件应抛出错误", async () => {
      const strapi = getStrapi();
      const memberService = strapi.plugin("zhao-channel").service("channel-member");
      await expect(
        memberService.inviteMember(fixtures.channels[0].id, fixtures.users[0].id, {
          email: "",
        })
      ).rejects.toThrow();
    });

    test("createForUser — 超大用户 ID 应优雅处理", async () => {
      const strapi = getStrapi();
      const inviteService = strapi.plugin("zhao-channel").service("user-invite");
      await expect(
        inviteService.createForUser(Number.MAX_SAFE_INTEGER, undefined, undefined)
      ).rejects.not.toBeNull();
    });
  });

  // ---------- 4. 幂等性 ----------
  describe("幂等性保证", () => {
    test("grantChannelsToUser — 重复授权返回 granted=0", async () => {
      const strapi = getStrapi();
      const permService = strapi.plugin("zhao-channel").service("channel-permission");
      // 第一次授权
      await permService.grantChannelsToUser(
        fixtures.users[5].id,
        [fixtures.channels[3].id],
        fixtures.users[0].id
      );
      // 第二次授权（相同渠道）
      const result = await permService.grantChannelsToUser(
        fixtures.users[5].id,
        [fixtures.channels[3].id],
        fixtures.users[0].id
      );
      expect(result.granted).toBe(0);
    });

    test("findByInviteCode — 多次调用返回一致结果", async () => {
      // 实际方法名与测试一致，无需修改
      const strapi = getStrapi();
      const inviteService = strapi.plugin("zhao-channel").service("user-invite");
      const result1 = await inviteService.findByInviteCode("INVITE001");
      const result2 = await inviteService.findByInviteCode("INVITE001");
      expect(result1).toEqual(result2);
    });
  });

  // ---------- 5. 跨渠道隔离 ----------
  describe("跨渠道资源隔离", () => {
    test("getMembers — 渠道 A 不应返回渠道 B 的成员", async () => {
      const strapi = getStrapi();
      const memberService = strapi.plugin("zhao-channel").service("channel-member");
      const membersA = await memberService.getMembers(fixtures.channels[0].id);
      const membersB = await memberService.getMembers(fixtures.channels[1].id);
      // 如果没有B的成员，跳过；如果有，确保成员ID不重叠
      if (membersB.members.length > 0 && membersA.members.length > 0) {
        const bIds = new Set(membersB.members.map((m: any) => m.id));
        const overlap = membersA.members.some((m: any) => bIds.has(m.id));
        expect(overlap).toBe(false);
      }
    });

    test("getUserAllChannels — 用户不应看到未授权的渠道", async () => {
      const strapi = getStrapi();
      const permService = strapi.plugin("zhao-channel").service("channel-permission");
      const memberService = strapi.plugin("zhao-channel").service("channel-member");
      const result = await permService.getUserAllChannels(fixtures.users[6].id);
      expect(Array.isArray(result)).toBe(true);
      for (const cid of result) {
        const hasUserChannel = await strapi.db.query("plugin::zhao-channel.user-channel").findOne({
          where: { user: fixtures.users[6].id, channel: cid },
        });
        const hasRoleChannel = await strapi.db.query("plugin::zhao-channel.role-channel").findOne({
          where: { channel: cid },
        });
        const hasMember = await strapi.db.query("plugin::zhao-channel.channel-member").findOne({
          where: { user: fixtures.users[6].id, channel: cid },
        });
        const isDescendant = hasUserChannel || hasRoleChannel || hasMember;
        expect(isDescendant).not.toBeNull();
      }
    });
  });

  // ---------- 6. 异常信息不泄露敏感细节 ----------
  describe("异常安全", () => {
    test("错误消息不应包含 SQL 或数据库细节", async () => {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      try {
        await channelService.findOne("invalid-id-string" as any);
      } catch (err: any) {
        const msg = err.message || err.toString();
        const sensitive = ["SELECT", "INSERT", "DELETE", "FROM", "WHERE", "foreign key", "SQL"];
        const leaked = sensitive.some((s) =>
          msg.toUpperCase().includes(s.toUpperCase())
        );
        expect(leaked).toBe(false);
      }
    });
  });
});