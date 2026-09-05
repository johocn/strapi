import { v4 as uuidv4 } from "uuid";
import type { Core } from "@strapi/strapi";

const INVITE_CODE_UID = "plugin::zhao-sso.sso-invite-code";
const REFERRAL_RELATION_UID = "plugin::zhao-sso.sso-referral-relation";
const INVITE_USAGE_UID = "plugin::zhao-sso.sso-invite-usage";
const USER_UID = "plugin::zhao-sso.sso-user";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  /**
   * 校验邀请码有效性（邀请码 + app_code 联合校验，防跨应用滥用）
   * 返回邀请码记录，无效则返回 null（不抛错，由调用方决定是否阻断）
   */
  const validateInviteCode = async (code: string, appCode: string): Promise<any | null> => {
    if (!code || !appCode) return null;

    try {
      const inviteCode = await strapi.db.query(INVITE_CODE_UID).findOne({
        where: { code, app_code: appCode, is_active: true },
        populate: ["creator"],
      });

      if (!inviteCode) return null;

      // 有效期校验
      const now = new Date();
      if (inviteCode.valid_from && new Date(inviteCode.valid_from) > now) return null;
      if (inviteCode.valid_until && new Date(inviteCode.valid_until) < now) return null;

      // 最大使用次数校验
      if (inviteCode.max_uses && inviteCode.use_count >= inviteCode.max_uses) return null;

      return inviteCode;
    } catch (e: any) {
      strapi.log.warn(`[sso-invite] 校验邀请码失败: ${e.message}`);
      return null;
    }
  };

  /**
   * 获取或创建虚拟用户（邀请码 creator 不存在时的兜底机制）
   * 场景：邀请码属于使用 SSO 之前注册的用户，sso_users 中无对应记录
   * 后台管理员可后续手动补齐虚拟用户信息
   */
  const getOrCreateVirtualUser = async (inviteCodeRecord: any): Promise<any> => {
    // 1. creator 存在且为有效 sso_user，直接返回
    if (inviteCodeRecord.creator && inviteCodeRecord.creator.id) {
      const existing = await strapi.db.query(USER_UID).findOne({
        where: { id: inviteCodeRecord.creator.id },
      });
      if (existing) return existing;
    }

    // 2. 查是否已存在同 username 的虚拟用户（避免重复创建）
    const virtualUsername = `virtual_${inviteCodeRecord.code}`;
    const existingVirtual = await strapi.db.query(USER_UID).findOne({
      where: { username: virtualUsername },
    });
    if (existingVirtual) return existingVirtual;

    // 3. 创建虚拟用户
    return strapi.db.query(USER_UID).create({
      data: {
        uuid: uuidv4(),
        username: virtualUsername,
        mobile: null,
        email: null,
        password_hash: null,
        status: "virtual",
        register_channel: "virtual_invite_code",
        invite_code_used: null,
        invited_by: null,
      },
    });
  };

  /**
   * 计算分销层级（inviter 的 level + 1，inviter 无上级则 level=1）
   */
  const calculateLevel = async (inviterId: number): Promise<number> => {
    const inviterRelation = await strapi.db.query(REFERRAL_RELATION_UID).findOne({
      where: { invitee: { id: inviterId } },
      orderBy: { level: "desc" },
    });
    if (!inviterRelation) return 1;
    return (inviterRelation.level || 0) + 1;
  };

  /**
   * 建立分销关系（核心方法）
   * 1. 更新 sso_users.invite_code_used + invited_by
   * 2. 插入 sso_referral_relations
   * 3. 插入 sso_invite_usages
   * 4. 更新 sso_invite_codes.use_count
   *
   * 幂等性：通过 sso_users.invite_code_used 判断已建立关系则跳过
   */
  const buildReferralRelation = async (params: {
    inviteeId: number;
    inviteCode: string;
    appCode: string;
    channelCode?: string;
  }): Promise<{ success: boolean; message: string; skip?: boolean }> => {
    const { inviteeId, inviteCode, appCode, channelCode } = params;

    try {
      // 0. 幂等检查：当前用户已使用过邀请码则跳过
      const invitee = await strapi.db.query(USER_UID).findOne({ where: { id: inviteeId } });
      if (!invitee) {
        return { success: false, message: "被邀请用户不存在" };
      }
      if (invitee.invite_code_used && invitee.invited_by) {
        return { success: true, message: "已建立分销关系，跳过", skip: true };
      }

      // 1. 校验邀请码有效性
      const inviteCodeRecord = await validateInviteCode(inviteCode, appCode);
      if (!inviteCodeRecord) {
        strapi.log.info(`[sso-invite] 邀请码无效或已过期: code=${inviteCode}, appCode=${appCode}`);
        return { success: false, message: "邀请码无效或已过期" };
      }

      // 2. 获取或创建邀请人（含虚拟用户兜底）
      const inviter = await getOrCreateVirtualUser(inviteCodeRecord);
      if (!inviter) {
        return { success: false, message: "无法获取邀请人" };
      }

      // 3. 防自邀
      if (inviter.id === inviteeId) {
        return { success: false, message: "不能邀请自己" };
      }

      // 4. 计算层级（无限延长，不截断）
      const level = await calculateLevel(inviter.id);

      // 5. 事务性写入（Strapi db transaction）
      const result = await strapi.db.transaction(async () => {
        // 5.1 更新 sso_users.invite_code_used + invited_by
        await strapi.db.query(USER_UID).update({
          where: { id: inviteeId },
          data: {
            invite_code_used: inviteCode,
            invited_by: inviter.id,
          },
        });

        // 5.2 插入 sso_referral_relations
        await strapi.db.query(REFERRAL_RELATION_UID).create({
          data: {
            inviter: { id: inviter.id },
            invitee: { id: inviteeId },
            invite_code: { id: inviteCodeRecord.id },
            level,
            channel_code: channelCode || null,
          },
        });

        // 5.3 插入 sso_invite_usages
        await strapi.db.query(INVITE_USAGE_UID).create({
          data: {
            user: { id: inviteeId },
            invite_code: { id: inviteCodeRecord.id },
            app_code: appCode,
            channel_code: channelCode || null,
            used_at: new Date(),
          },
        });

        // 5.4 更新 sso_invite_codes.use_count
        await strapi.db.query(INVITE_CODE_UID).update({
          where: { id: inviteCodeRecord.id },
          data: { use_count: (inviteCodeRecord.use_count || 0) + 1 },
        });

        return { level, inviterId: inviter.id };
      });

      strapi.log.info(
        `[sso-invite] 分销关系建立成功: invitee=${inviteeId}, inviter=${result.inviterId}, level=${result.level}, code=${inviteCode}`
      );
      return { success: true, message: "分销关系建立成功" };
    } catch (e: any) {
      strapi.log.warn(`[sso-invite] 建立分销关系失败: ${e.message}`);
      return { success: false, message: e.message };
    }
  };

  /**
   * 为用户获取/生成专属邀请码（creator=本人, app_code 维度, 幂等）
   * 已有有效码直接返回；无则生成 8 位唯一码并落库（user_campaign 类型）
   */
  const ensureOwnInviteCode = async (ssoUserId: number, appCode: string): Promise<string> => {
    try {
      const exist = await strapi.db.query(INVITE_CODE_UID).findOne({
        where: { creator: ssoUserId, app_code: appCode, is_active: true },
      });
      if (exist?.code) return exist.code;

      // 生成唯一邀请码（8 位，去掉易混淆字符 0/O/1/I）
      const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      for (let attempt = 0; attempt < 5; attempt++) {
        let code = "";
        for (let i = 0; i < 8; i++) code += charset[Math.floor(Math.random() * charset.length)];
        const dup = await strapi.db.query(INVITE_CODE_UID).findOne({ where: { code } });
        if (!dup) {
          await strapi.db.query(INVITE_CODE_UID).create({
            data: {
              code,
              app_code: appCode,
              creator: { id: ssoUserId },
              invite_type: "user_campaign",
              use_count: 0,
              per_user_limit: 1,
              max_uses: 0,
              is_active: true,
              bonus_tags: {},
            },
          });
          return code;
        }
      }
      return "";
    } catch (e: any) {
      strapi.log.warn(`[sso-invite] 生成邀请码失败: ${e.message}`);
      return "";
    }
  };

  /**
   * 查询该用户作为 inviter 的全部「邀约关系落地」列表（分享领分前提锚点）
   * 落地=作为 inviter 建立了一条分销关系（被邀请人注册成功），返回 { id, createdAt } 按 id 倒序。
   * 只读门面，供 zhao-point 跨插件调用（需排除已被领取消耗的落地），避免直接操作 sso_referral_relations 表。
   */
  const listLandings = async (userId: number): Promise<Array<{ id: number; createdAt: number }>> => {
    try {
      // 用自增主键 id 倒序取最新一条：id 单调递增，新落地必然更新；避免依赖 createdAt 排序
      const rels = await strapi.db.query(REFERRAL_RELATION_UID).findMany({
        where: { inviter: { id: userId } },
        orderBy: { id: "desc" },
        select: ["id", "createdAt"],
      });
      return (rels || []).map((r) => ({
        id: Number(r.id),
        createdAt: r.createdAt ? new Date(r.createdAt).getTime() : 0,
      }));
    } catch (e: any) {
      strapi.log.warn(`[sso-invite] 查询邀约落地列表失败: ${e.message}`);
      return [];
    }
  };

  return {
    validateInviteCode,
    getOrCreateVirtualUser,
    buildReferralRelation,
    ensureOwnInviteCode,
    listLandings,
  };
};
