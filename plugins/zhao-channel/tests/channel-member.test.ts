/**
 * zhao-channel 渠道成员管理 API 测试
 *
 * 测试覆盖 Service 层方法（实际签名）：
 * channelMember.verifyInvitationCode(code)                   → { valid, channel? }
 * channelMember.getMyChannel(userId)                          → { channel } | null
 * channelMember.updateMyChannel(userId, data)                 → { channel }
 * channelMember.inviteMember(channelId, inviterId, {email, role?}) → { invitation: {...} }
 * channelMember.getMembers(channelId)                         → { members: [...] }
 * channelMember.removeMember(channelId, userId)               → { data: null }
 * channelMember.updateMemberRole(channelId, userId, newRole)  → { data: null }
 * -- 新增测试方法 --
 * inviteMember → 邀请新用户（未注册邮箱）
 * updateMemberRole → 不存在的成员应抛出错误
 * verifyInvitationCode → 禁用渠道的邀请码
 * getMyChannel → 未设置 currentChannelId 的用户
 * getMembers → 无成员渠道返回空数组
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
// 模块三：渠道成员管理
// ==========================================
describe("渠道成员管理 (Service层)", () => {
  describe("verifyInvitationCode(code) — 验证邀请码", () => {
    test("有效渠道邀请码应返回 valid=true 和渠道信息", async () => {
      const strapi = getStrapi();
      const memberService = strapi.plugin("zhao-channel").service("channel-member");
      const result = await memberService.verifyInvitationCode(fixtures.channels[0].code);
      expect(result.valid).toBe(true);
      expect(result.channel).toBeDefined();
    });

    // ---- 新增：禁用渠道的邀请码 ----
    test("禁用渠道的邀请码应返回 valid=false", async () => {
      const strapi = getStrapi();
      const memberService = strapi.plugin("zhao-channel").service("channel-member");
      const result = await memberService.verifyInvitationCode(fixtures.channels[3].code);
      expect(result.valid).toBe(false);
      expect(result.ok).toBe(true);
    });
  });

  describe("getMyChannel(userId) — 获取我的渠道", () => {
    test("应返回用户所关联的渠道", async () => {
      const strapi = getStrapi();
      const memberService = strapi.plugin("zhao-channel").service("channel-member");
      const result = await memberService.getMyChannel(fixtures.users[0].id);
      expect(result).toBeTruthy();
    });

    test("无渠道的用户应返回个人渠道", async () => {
      const strapi = getStrapi();
      const memberService = strapi.plugin("zhao-channel").service("channel-member");
      const result = await memberService.getMyChannel(fixtures.users[3].id);
      expect(result).toBeTruthy();
      expect(result.channel.name).toContain("个人渠道");
    });

    test("未设置 currentChannelId 的用户应返回 null", async () => {
      const strapi = getStrapi();
      const memberService = strapi.plugin("zhao-channel").service("channel-member");
      const members = await strapi.db.query("plugin::zhao-channel.channel-member").findMany({
        where: { user: fixtures.users[7].id },
      });
      for (const m of members) {
        await strapi.db.query("plugin::zhao-channel.channel-member").update({
          where: { id: m.id },
          data: { isCurrent: false },
        });
      }
      const result = await memberService.getMyChannel(fixtures.users[7].id);
      expect(result).toBeNull();
    });
  });

  describe("updateMyChannel(userId, data) — 更新我的渠道信息", () => {
    test("应更新用户所在渠道的自身信息", async () => {
      const strapi = getStrapi();
      const memberService = strapi.plugin("zhao-channel").service("channel-member");
      const result = await memberService.updateMyChannel(fixtures.users[0].id, {
        name: "已更新渠道名",
      });
      expect(result).toBeTruthy();
      expect(result.channel.name).toBe("已更新渠道名");
    });
  });

  describe("inviteMember(channelId, inviterId, data) — 邀请成员", () => {
    test("应邀请现有用户加入渠道（角色：member）", async () => {
      const strapi = getStrapi();
      const memberService = strapi.plugin("zhao-channel").service("channel-member");
      const result = await memberService.inviteMember(
        fixtures.channels[0].id,
        fixtures.users[0].id,
        { email: fixtures.users[3].email, role: "member" }
      );
      expect(result).toBeTruthy();
      expect(result.invitation.isNewUser).toBe(false);
    });

    test("重复邀请应正常工作（幂等）", async () => {
      const strapi = getStrapi();
      const memberService = strapi.plugin("zhao-channel").service("channel-member");
      const result = await memberService.inviteMember(
        fixtures.channels[0].id,
        fixtures.users[0].id,
        { email: fixtures.users[3].email }
      );
      expect(result).toBeTruthy();
      expect(result.invitation.isNewUser).toBe(false);
    });

    // ---- 新增：邀请未注册邮箱（新用户） ----
    test("应邀请未注册用户（新用户）并自动创建记录", async () => {
      const strapi = getStrapi();
      const memberService = strapi.plugin("zhao-channel").service("channel-member");
      const newEmail = "newunreg@channel-test.com";
      const result = await memberService.inviteMember(
        fixtures.channels[0].id,
        fixtures.users[1].id, // 区域代理用户作为邀请人
        { email: newEmail, role: "admin" }
      );
      expect(result).toBeTruthy();
      expect(result.invitation.isNewUser).toBe(true);
      expect(result.invitation.user.email).toBe(newEmail);
    });
  });

  describe("getMembers(channelId) — 获取渠道成员列表", () => {
    test("应返回渠道的所有成员", async () => {
      const strapi = getStrapi();
      const memberService = strapi.plugin("zhao-channel").service("channel-member");
      const result = await memberService.getMembers(fixtures.channels[0].id);
      expect(result).toBeTruthy();
      expect(Array.isArray(result.members)).toBe(true);
      expect(result.members.length).toBeGreaterThanOrEqual(1);
    });

    test("无成员的渠道应返回空数组", async () => {
      const strapi = getStrapi();
      const memberService = strapi.plugin("zhao-channel").service("channel-member");
      const result = await memberService.getMembers(fixtures.channels[4].id);
      expect(result).toBeTruthy();
      expect(Array.isArray(result.members)).toBe(true);
      expect(result.members.length).toBe(0);
    });
  });

  describe("removeMember(channelId, userId) — 移除成员", () => {
    test("应移除指定成员", async () => {
      const strapi = getStrapi();
      const memberService = strapi.plugin("zhao-channel").service("channel-member");
      // 先把用户3加入渠道1
      await memberService.inviteMember(
        fixtures.channels[0].id,
        fixtures.users[0].id,
        { email: fixtures.users[3].email }
      );
      // 移除
      const removeResult = await memberService.removeMember(
        fixtures.channels[0].id,
        fixtures.users[3].id
      );
      expect(removeResult).toBeTruthy();
      // 验证已移除
      const members = await memberService.getMembers(fixtures.channels[0].id);
      const stillExists = members.members.some(
        (m: any) => m.id === fixtures.users[3].id
      );
      expect(stillExists).toBe(false);
    });
  });

  describe("updateMemberRole(channelId, userId, newRole) — 更新成员角色", () => {
    test("应将成员角色从 member 更新为 admin", async () => {
      const strapi = getStrapi();
      const memberService = strapi.plugin("zhao-channel").service("channel-member");
      // 先确保用户1是成员
      await memberService.inviteMember(
        fixtures.channels[0].id,
        fixtures.users[0].id,
        { email: fixtures.users[1].email, role: "member" }
      );
      const result = await memberService.updateMemberRole(
        fixtures.channels[0].id,
        fixtures.users[1].id,
        "admin"
      );
      expect(result).toBeTruthy();
    });

    // ---- 新增：更新不存在成员的权限应抛出错误 ----
    test("不存在的成员应抛出错误", async () => {
      const strapi = getStrapi();
      const memberService = strapi.plugin("zhao-channel").service("channel-member");
      await expect(
        memberService.updateMemberRole(fixtures.channels[0].id, 99999, "admin")
      ).rejects.toThrow("成员不存在");
    });
  });
});