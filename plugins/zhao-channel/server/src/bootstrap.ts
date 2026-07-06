import type { Core } from "@strapi/strapi";
import { getBatchGrantQueue } from "./utils/queue";
import { isAdminContext } from "./utils/registration-context";

const USER_CHANNEL_UID = "plugin::zhao-channel.user-channel";
const ROLE_CHANNEL_UID = "plugin::zhao-channel.role-channel";
const USER_UID = "plugin::users-permissions.user";

const USER_INVITE_UID = "plugin::zhao-channel.user-invite";
const CHANNEL_MEMBER_UID = "plugin::zhao-channel.channel-member";
const CHANNEL_UID = "plugin::zhao-channel.channel";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  setTimeout(async () => {
    try {
      await initDefaultRootChannel(strapi);
    } catch (err: any) {
      strapi.log.warn(`[zhao-channel] 默认根渠道初始化失败（可通过后台手动创建）: ${err.message}`);
    }
  }, 5000);

  // ─── User lifecycle hook: 用户注册时自动生成邀请码 ───
  strapi.db.lifecycles.subscribe({
    models: [USER_UID],
    async afterCreate(event: any) {
      const { result } = event;
      if (!result?.id) return;

      try {
        const userInviteService = strapi.plugin("zhao-channel").service("user-invite");
        await userInviteService.createForUser(result.id);

        // 后台管理面板创建的账号不自动创建个人渠道
        // 注意：isAdminContext 必须在 setTimeout 之前调用，因为 setTimeout 会断开 AsyncLocalStorage 链
        const _skipAutoChannel = isAdminContext();

        // 延迟检查：若为前台自然注册且非邀请码，自动创建个人渠道
        // 邀请码注册在 entityService.create() 后还会创建 channel-member，
        // 使用 setTimeout 确保在 register() 全部完成后再检查，避免重复创建
        setTimeout(async () => {
          try {
            if (_skipAutoChannel) return;
            const existingMember = await strapi.db.query(CHANNEL_MEMBER_UID).findOne({
              where: { user: result.id, isCurrent: true },
            });
            if (existingMember) return;

            const channelService = strapi.plugin("zhao-channel").service("channel");

            const channel = await channelService.createRoot({
              name: `${result.username || result.email || `用户${result.id}`}的个人渠道`,
              description: "自动创建的个人渠道",
            });

            await strapi.db.query(CHANNEL_MEMBER_UID).create({
              data: {
                channel: channel.id,
                user: result.id,
                role: "member",
                isCurrent: true,
              },
            });

            const userInvite = await strapi.db.query(USER_INVITE_UID).findOne({
              where: { user: result.id },
            });
            if (userInvite) {
              await strapi.db.query(USER_INVITE_UID).update({
                where: { id: userInvite.id },
                data: {
                  inviteChannel: channel.id,
                  inviteMethod: "organic",
                },
              });
            }

            strapi.log.info(
              `[zhao-channel] 自动为用户 ${result.id} 创建个人渠道: ${channel.name} (ID: ${channel.id})`
            );
          } catch (err: any) {
            strapi.log.error(
              `[zhao-channel] 自动创建用户 ${result.id} 的个人渠道失败: ${err.message}`
            );
          }
        }, 0);
      } catch (err: any) {
        strapi.log.error(
          `[zhao-channel] Failed to create user-invite for user ${result.id}: ${err.message}`
        );
      }
    },
  });

  // ─── 注册渠道特有权限策略到 zhao-auth ───
  try {
    const authService = strapi.plugin("zhao-auth").service("auth");

    // has-channel-access-advanced: 从 params.id / body.parentChannel / query.channel 提取渠道 ID
    (authService as any).registerPolicy(
      "has-channel-access-advanced",
      async (context: any) => {
        if (!context.user?.id) {
          return { passed: false, code: "UNAUTHENTICATED", message: "未认证，请先登录" };
        }

        const channelId =
          (context.params.channelId as number | undefined) ||
          (context.params.id as number | undefined) ||
          (context.body.channelId as number | string | undefined) ||
          (context.body.channelIds?.[0] as number | undefined) ||
          (context.body.parentChannel as number | undefined) ||
          (context.query?.channel as number | string | undefined);

        if (!channelId) {
          return { passed: false, code: "MISSING_CHANNEL_ID", message: "缺少渠道 ID" };
        }

        try {
          const permService = strapi.plugin("zhao-channel").service("channel-permission");
          const hasPermission = await permService.checkUserChannelPermission(
            context.user.id,
            Number(channelId)
          );
          if (!hasPermission) {
            return { passed: false, code: "FORBIDDEN_CHANNEL", message: "无权访问该渠道" };
          }
          return { passed: true };
        } catch {
          return { passed: false, code: "CHANNEL_SERVICE_UNAVAILABLE", message: "渠道权限服务不可用" };
        }
      }
    );

    // is-channel-admin: 检查用户角色是否 >= admin (level >= 20)
    (authService as any).registerPolicy(
      "is-channel-admin",
      async (context: any) => {
        if (!context.user?.id) {
          return { passed: false, code: "UNAUTHENTICATED", message: "未认证，请先登录" };
        }

        const channelId =
          (context.params.channelId as number | undefined) ||
          (context.params.id as number | undefined) ||
          (context.body.channelId as number | string | undefined) ||
          (context.body.channelIds?.[0] as number | undefined) ||
          (context.body.parentChannel as number | undefined) ||
          (context.query?.channel as number | string | undefined);

        if (!channelId) {
          return { passed: false, code: "MISSING_CHANNEL_ID", message: "缺少渠道 ID" };
        }

        try {
          const permService = strapi.plugin("zhao-channel").service("channel-permission");
          const isAdmin = await permService.checkChannelMemberRole(
            context.user.id,
            Number(channelId),
            20
          );
          if (!isAdmin) {
            return { passed: false, code: "FORBIDDEN_ROLE", message: "需要渠道管理员权限" };
          }
          return { passed: true };
        } catch {
          return { passed: false, code: "CHANNEL_SERVICE_UNAVAILABLE", message: "渠道权限服务不可用" };
        }
      }
    );

    // is-channel-owner: 检查用户角色是否 == owner (level == 30)
    (authService as any).registerPolicy(
      "is-channel-owner",
      async (context: any) => {
        if (!context.user?.id) {
          return { passed: false, code: "UNAUTHENTICATED", message: "未认证，请先登录" };
        }

        const channelId =
          (context.params.channelId as number | undefined) ||
          (context.params.id as number | undefined) ||
          (context.body.channelId as number | string | undefined) ||
          (context.body.channelIds?.[0] as number | undefined) ||
          (context.body.parentChannel as number | undefined) ||
          (context.query?.channel as number | string | undefined);

        if (!channelId) {
          return { passed: false, code: "MISSING_CHANNEL_ID", message: "缺少渠道 ID" };
        }

        try {
          const permService = strapi.plugin("zhao-channel").service("channel-permission");
          const isOwner = await permService.checkChannelMemberRole(
            context.user.id,
            Number(channelId),
            30
          );
          if (!isOwner) {
            return { passed: false, code: "FORBIDDEN_ROLE", message: "需要渠道所有者权限" };
          }
          return { passed: true };
        } catch {
          return { passed: false, code: "CHANNEL_SERVICE_UNAVAILABLE", message: "渠道权限服务不可用" };
        }
      }
    );

    strapi.log.info("[zhao-channel] 渠道权限策略已注册到 zhao-auth");
  } catch (err: any) {
    strapi.log.warn(`[zhao-channel] zhao-auth 未启用，渠道权限策略跳过注册: ${err.message}`);
  }

  const batchGrantQueue = getBatchGrantQueue();
  if (batchGrantQueue) {
    batchGrantQueue.process("batch-grant", async (job) => {
    const { type, targetId, channelIds, grantedBy } = job.data;

    if (type === "user") {
      for (const channelId of channelIds) {
        const existing = await strapi.db.query(USER_CHANNEL_UID).findOne({
          where: { user: targetId, channel: channelId },
        });
        if (!existing) {
          await strapi.db.query(USER_CHANNEL_UID).create({
            data: { user: targetId, channel: channelId, grantedBy },
          });
        }
      }

      const { setUserChannelCache, deleteUserAllChannelsCache } = await import(
        "./utils/redis"
      );
      const allUserChannels = await strapi.db.query(USER_CHANNEL_UID).findMany({
        where: { user: targetId },
        populate: ["channel"],
      });
      const allChannelIds = allUserChannels.map((uc: any) =>
        uc.channel?.id || uc.channel
      );
      await setUserChannelCache(targetId, allChannelIds);
      await deleteUserAllChannelsCache(targetId);
    } else if (type === "role") {
      for (const channelId of channelIds) {
        const existing = await strapi.db.query(ROLE_CHANNEL_UID).findOne({
          where: { role: targetId, channel: channelId },
        });
        if (!existing) {
          await strapi.db.query(ROLE_CHANNEL_UID).create({
            data: { role: targetId, channel: channelId, grantedBy },
          });
        }
      }

      const { setRoleChannelCache, deleteUserAllChannelsCache } = await import(
        "./utils/redis"
      );
      const allRoleChannels = await strapi.db.query(ROLE_CHANNEL_UID).findMany({
        where: { role: targetId },
        populate: ["channel"],
      });
      const allChannelIds = allRoleChannels.map((rc: any) =>
        rc.channel?.id || rc.channel
      );
      await setRoleChannelCache(targetId, allChannelIds);

      const usersWithRole = await strapi.db
        .query("plugin::users-permissions.user")
        .findMany({
          where: { role: targetId },
          select: ["id"],
        });
      for (const user of usersWithRole) {
        await deleteUserAllChannelsCache(user.id);
      }
    }

    return { success: true, granted: channelIds.length };
  });

    batchGrantQueue.on("failed", (job, err) => {
      strapi.log.error(`Batch grant job ${job.id} failed: ${err.message}`);
    });
  }
};

async function initDefaultRootChannel(strapi: Core.Strapi) {
  const existingRoot = await strapi.db.query(CHANNEL_UID).findOne({
    where: { channelTier: "root" },
  });

  if (existingRoot) {
    strapi.log.info(`[zhao-channel] 根渠道已存在，跳过初始化 (ID: ${existingRoot.id})`);
    return;
  }

  const channelService = strapi.plugin("zhao-channel").service("channel");
  const rootChannel = await channelService.createRoot({
    name: "平台根渠道",
    description: "系统自动创建的根渠道，所有渠道的顶级父渠道",
  });

  strapi.log.info(`[zhao-channel] 默认根渠道创建成功 (ID: ${rootChannel.id}, Code: ${rootChannel.code})`);

  const adminUser = await strapi.db.query(USER_UID).findOne({
    where: { role: { type: "admin" } },
  });

  if (adminUser) {
    const existingMember = await strapi.db.query(CHANNEL_MEMBER_UID).findOne({
      where: { user: adminUser.id, channel: rootChannel.id },
    });

    if (!existingMember) {
      await strapi.db.query(CHANNEL_MEMBER_UID).create({
        data: {
          channel: rootChannel.id,
          user: adminUser.id,
          role: "owner",
          isCurrent: true,
        },
      });
      strapi.log.info(`[zhao-channel] admin 用户已关联到根渠道作为 owner (User ID: ${adminUser.id})`);
    }
  }

  const adminRole = await strapi.db.query("plugin::users-permissions.role").findOne({
    where: { type: "admin" },
  });

  if (adminRole) {
    const existingRoleChannel = await strapi.db.query(ROLE_CHANNEL_UID).findOne({
      where: { role: adminRole.id, channel: rootChannel.id },
    });

    if (!existingRoleChannel) {
      await strapi.db.query(ROLE_CHANNEL_UID).create({
        data: {
          role: adminRole.id,
          channel: rootChannel.id,
          grantedBy: "system",
        },
      });
      strapi.log.info(`[zhao-channel] admin 角色已关联到根渠道 (Role ID: ${adminRole.id})`);
    }
  }

  const existingUserChannel = await strapi.db.query(USER_CHANNEL_UID).findOne({
    where: { channel: rootChannel.id },
  });

  if (!existingUserChannel && adminUser) {
    await strapi.db.query(USER_CHANNEL_UID).create({
      data: {
        user: adminUser.id,
        channel: rootChannel.id,
        grantedBy: "system",
      },
    });
    strapi.log.info(`[zhao-channel] admin 用户渠道权限已授予 (User ID: ${adminUser.id})`);
  }
}
