import Queue from "bull";
import { AsyncLocalStorage } from "async_hooks";
import Redis from "ioredis";
import * as crypto from "crypto";
const REDIS_URL$1 = process.env.REDIS_URL || "redis://localhost:6379";
let queueInstance = null;
let queueAvailable = null;
function getQueue() {
  if (queueAvailable === false) return null;
  if (!queueInstance) {
    try {
      queueInstance = new Queue("channel-batch-grant", REDIS_URL$1, {
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2e3
          },
          removeOnComplete: 10,
          removeOnFail: 5
        }
      });
      queueInstance.on("error", () => {
        queueAvailable = false;
      });
      queueAvailable = true;
    } catch {
      queueAvailable = false;
      return null;
    }
  }
  return queueInstance;
}
function addBatchGrantJob(data) {
  const q = getQueue();
  if (!q) return Promise.resolve(null);
  return q.add("batch-grant", data);
}
function getQueueStatus() {
  const q = getQueue();
  if (!q) {
    return Promise.resolve({ waiting: 0, active: 0, completed: 0, failed: 0 });
  }
  return Promise.all([
    q.getWaitingCount(),
    q.getActiveCount(),
    q.getCompletedCount(),
    q.getFailedCount()
  ]).then(([waiting, active, completed, failed]) => ({
    waiting,
    active,
    completed,
    failed
  }));
}
function getBatchGrantQueue() {
  return getQueue();
}
async function closeBatchGrantQueue() {
  if (queueInstance) {
    try {
      await queueInstance.close();
    } catch {
    }
    queueInstance = null;
  }
  queueAvailable = null;
}
const queue = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  addBatchGrantJob,
  closeBatchGrantQueue,
  getBatchGrantQueue,
  getQueueStatus
}, Symbol.toStringTag, { value: "Module" }));
const contextStorage = new AsyncLocalStorage();
function runWithContext(url, fn) {
  return contextStorage.run({ url }, fn);
}
function isAdminContext() {
  const ctx = contextStorage.getStore();
  if (!ctx) return false;
  return ctx.url.includes("/admin/") || ctx.url.includes("/content-manager/");
}
const USER_CHANNEL_UID$2 = "plugin::zhao-channel.user-channel";
const ROLE_CHANNEL_UID$2 = "plugin::zhao-channel.role-channel";
const USER_UID$3 = "plugin::users-permissions.user";
const USER_INVITE_UID$2 = "plugin::zhao-channel.user-invite";
const CHANNEL_MEMBER_UID$4 = "plugin::zhao-channel.channel-member";
const CHANNEL_UID$3 = "plugin::zhao-channel.channel";
const bootstrap = ({ strapi }) => {
  setTimeout(async () => {
    try {
      await initDefaultRootChannel(strapi);
    } catch (err) {
      strapi.log.warn(`[zhao-channel] 默认根渠道初始化失败（可通过后台手动创建）: ${err.message}`);
    }
  }, 5e3);
  strapi.db.lifecycles.subscribe({
    models: [USER_UID$3],
    async afterCreate(event) {
      const { result } = event;
      if (!result?.id) return;
      try {
        const userInviteService = strapi.plugin("zhao-channel").service("user-invite");
        await userInviteService.createForUser(result.id);
        const _skipAutoChannel = isAdminContext();
        setTimeout(async () => {
          try {
            if (_skipAutoChannel) return;
            const existingMember = await strapi.db.query(CHANNEL_MEMBER_UID$4).findOne({
              where: { user: result.id, isCurrent: true }
            });
            if (existingMember) return;
            const channelService = strapi.plugin("zhao-channel").service("channel");
            const channel2 = await channelService.createRoot({
              name: `${result.username || result.email || `用户${result.id}`}的个人渠道`,
              description: "自动创建的个人渠道"
            });
            await strapi.db.query(CHANNEL_MEMBER_UID$4).create({
              data: {
                channel: channel2.id,
                user: result.id,
                role: "member",
                isCurrent: true
              }
            });
            const userInvite2 = await strapi.db.query(USER_INVITE_UID$2).findOne({
              where: { user: result.id }
            });
            if (userInvite2) {
              await strapi.db.query(USER_INVITE_UID$2).update({
                where: { id: userInvite2.id },
                data: {
                  inviteChannel: channel2.id,
                  inviteMethod: "organic"
                }
              });
            }
            strapi.log.info(
              `[zhao-channel] 自动为用户 ${result.id} 创建个人渠道: ${channel2.name} (ID: ${channel2.id})`
            );
          } catch (err) {
            strapi.log.error(
              `[zhao-channel] 自动创建用户 ${result.id} 的个人渠道失败: ${err.message}`
            );
          }
        }, 0);
      } catch (err) {
        strapi.log.error(
          `[zhao-channel] Failed to create user-invite for user ${result.id}: ${err.message}`
        );
      }
    }
  });
  try {
    const authService = strapi.plugin("zhao-auth").service("auth");
    authService.registerPolicy(
      "has-channel-access-advanced",
      async (context) => {
        if (!context.user?.id) {
          return { passed: false, code: "UNAUTHENTICATED", message: "未认证，请先登录" };
        }
        const channelId = context.params.channelId || context.params.id || context.body.channelId || context.body.channelIds?.[0] || context.body.parentChannel || context.query?.channel;
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
    authService.registerPolicy(
      "is-channel-admin",
      async (context) => {
        if (!context.user?.id) {
          return { passed: false, code: "UNAUTHENTICATED", message: "未认证，请先登录" };
        }
        const channelId = context.params.channelId || context.params.id || context.body.channelId || context.body.channelIds?.[0] || context.body.parentChannel || context.query?.channel;
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
    authService.registerPolicy(
      "is-channel-owner",
      async (context) => {
        if (!context.user?.id) {
          return { passed: false, code: "UNAUTHENTICATED", message: "未认证，请先登录" };
        }
        const channelId = context.params.channelId || context.params.id || context.body.channelId || context.body.channelIds?.[0] || context.body.parentChannel || context.query?.channel;
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
  } catch (err) {
    strapi.log.warn(`[zhao-channel] zhao-auth 未启用，渠道权限策略跳过注册: ${err.message}`);
  }
  const batchGrantQueue = getBatchGrantQueue();
  if (batchGrantQueue) {
    batchGrantQueue.process("batch-grant", async (job) => {
      const { type, targetId, channelIds, grantedBy } = job.data;
      if (type === "user") {
        for (const channelId of channelIds) {
          const existing = await strapi.db.query(USER_CHANNEL_UID$2).findOne({
            where: { user: targetId, channel: channelId }
          });
          if (!existing) {
            await strapi.db.query(USER_CHANNEL_UID$2).create({
              data: { user: targetId, channel: channelId, grantedBy }
            });
          }
        }
        const { setUserChannelCache: setUserChannelCache2, deleteUserAllChannelsCache: deleteUserAllChannelsCache2 } = await Promise.resolve().then(() => redis);
        const allUserChannels = await strapi.db.query(USER_CHANNEL_UID$2).findMany({
          where: { user: targetId },
          populate: ["channel"]
        });
        const allChannelIds = allUserChannels.map(
          (uc) => uc.channel?.id || uc.channel
        );
        await setUserChannelCache2(targetId, allChannelIds);
        await deleteUserAllChannelsCache2(targetId);
      } else if (type === "role") {
        for (const channelId of channelIds) {
          const existing = await strapi.db.query(ROLE_CHANNEL_UID$2).findOne({
            where: { role: targetId, channel: channelId }
          });
          if (!existing) {
            await strapi.db.query(ROLE_CHANNEL_UID$2).create({
              data: { role: targetId, channel: channelId, grantedBy }
            });
          }
        }
        const { setRoleChannelCache: setRoleChannelCache2, deleteUserAllChannelsCache: deleteUserAllChannelsCache2 } = await Promise.resolve().then(() => redis);
        const allRoleChannels = await strapi.db.query(ROLE_CHANNEL_UID$2).findMany({
          where: { role: targetId },
          populate: ["channel"]
        });
        const allChannelIds = allRoleChannels.map(
          (rc) => rc.channel?.id || rc.channel
        );
        await setRoleChannelCache2(targetId, allChannelIds);
        const usersWithRole = await strapi.db.query("plugin::users-permissions.user").findMany({
          where: { role: targetId },
          select: ["id"]
        });
        for (const user of usersWithRole) {
          await deleteUserAllChannelsCache2(user.id);
        }
      }
      return { success: true, granted: channelIds.length };
    });
    batchGrantQueue.on("failed", (job, err) => {
      strapi.log.error(`Batch grant job ${job.id} failed: ${err.message}`);
    });
  }
};
async function initDefaultRootChannel(strapi) {
  const existingRoot = await strapi.db.query(CHANNEL_UID$3).findOne({
    where: { channelTier: "root" }
  });
  if (existingRoot) {
    strapi.log.info(`[zhao-channel] 根渠道已存在，跳过初始化 (ID: ${existingRoot.id})`);
    return;
  }
  const channelService = strapi.plugin("zhao-channel").service("channel");
  const rootChannel = await channelService.createRoot({
    name: "平台根渠道",
    description: "系统自动创建的根渠道，所有渠道的顶级父渠道"
  });
  strapi.log.info(`[zhao-channel] 默认根渠道创建成功 (ID: ${rootChannel.id}, Code: ${rootChannel.code})`);
  const adminUser = await strapi.db.query(USER_UID$3).findOne({
    where: { role: { type: "admin" } }
  });
  if (adminUser) {
    const existingMember = await strapi.db.query(CHANNEL_MEMBER_UID$4).findOne({
      where: { user: adminUser.id, channel: rootChannel.id }
    });
    if (!existingMember) {
      await strapi.db.query(CHANNEL_MEMBER_UID$4).create({
        data: {
          channel: rootChannel.id,
          user: adminUser.id,
          role: "owner",
          isCurrent: true
        }
      });
      strapi.log.info(`[zhao-channel] admin 用户已关联到根渠道作为 owner (User ID: ${adminUser.id})`);
    }
  }
  const adminRole = await strapi.db.query("plugin::users-permissions.role").findOne({
    where: { type: "admin" }
  });
  if (adminRole) {
    const existingRoleChannel = await strapi.db.query(ROLE_CHANNEL_UID$2).findOne({
      where: { role: adminRole.id, channel: rootChannel.id }
    });
    if (!existingRoleChannel) {
      await strapi.db.query(ROLE_CHANNEL_UID$2).create({
        data: {
          role: adminRole.id,
          channel: rootChannel.id,
          grantedBy: "system"
        }
      });
      strapi.log.info(`[zhao-channel] admin 角色已关联到根渠道 (Role ID: ${adminRole.id})`);
    }
  }
  const existingUserChannel = await strapi.db.query(USER_CHANNEL_UID$2).findOne({
    where: { channel: rootChannel.id }
  });
  if (!existingUserChannel && adminUser) {
    await strapi.db.query(USER_CHANNEL_UID$2).create({
      data: {
        user: adminUser.id,
        channel: rootChannel.id,
        grantedBy: "system"
      }
    });
    strapi.log.info(`[zhao-channel] admin 用户渠道权限已授予 (User ID: ${adminUser.id})`);
  }
}
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let client = null;
let redisAvailable = null;
function getRedisClient() {
  if (redisAvailable === false) return null;
  if (!client) {
    try {
      client = new Redis(REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null
        // 不自动重试
      });
    } catch {
      redisAvailable = false;
      return null;
    }
  }
  return client;
}
async function ensureRedisAvailable() {
  if (redisAvailable === false) return false;
  const redis2 = getRedisClient();
  if (!redis2) {
    redisAvailable = false;
    return false;
  }
  try {
    if (redis2.status === "wait" || redis2.status === "connect") {
      await redis2.connect();
    }
    await redis2.ping();
    redisAvailable = true;
    return true;
  } catch {
    redisAvailable = false;
    return false;
  }
}
async function closeRedisClient() {
  if (client) {
    try {
      await client.quit();
    } catch {
    }
    client = null;
  }
  redisAvailable = null;
}
async function setUserChannelCache(userId, channelIds) {
  if (!await ensureRedisAvailable()) return;
  try {
    const redis2 = client;
    const key = `user:${userId}:channels`;
    await redis2.set(key, JSON.stringify(channelIds), "EX", 3600);
  } catch {
    redisAvailable = false;
  }
}
async function getUserChannelCache(userId) {
  if (!await ensureRedisAvailable()) return null;
  try {
    const redis2 = client;
    const key = `user:${userId}:channels`;
    const result = await redis2.get(key);
    return result ? JSON.parse(result) : null;
  } catch {
    redisAvailable = false;
    return null;
  }
}
async function deleteUserChannelCache(userId) {
  if (!await ensureRedisAvailable()) return;
  try {
    const redis2 = client;
    const key = `user:${userId}:channels`;
    await redis2.del(key);
  } catch {
    redisAvailable = false;
  }
}
async function setRoleChannelCache(roleId, channelIds) {
  if (!await ensureRedisAvailable()) return;
  try {
    const redis2 = client;
    const key = `role:${roleId}:channels`;
    await redis2.set(key, JSON.stringify(channelIds), "EX", 3600);
  } catch {
    redisAvailable = false;
  }
}
async function getRoleChannelCache(roleId) {
  if (!await ensureRedisAvailable()) return null;
  try {
    const redis2 = client;
    const key = `role:${roleId}:channels`;
    const result = await redis2.get(key);
    return result ? JSON.parse(result) : null;
  } catch {
    redisAvailable = false;
    return null;
  }
}
async function deleteRoleChannelCache(roleId) {
  if (!await ensureRedisAvailable()) return;
  try {
    const redis2 = client;
    const key = `role:${roleId}:channels`;
    await redis2.del(key);
  } catch {
    redisAvailable = false;
  }
}
async function deleteUserAllChannelsCache(userId) {
  if (!await ensureRedisAvailable()) return;
  try {
    const redis2 = client;
    const key = `user:${userId}:allChannels`;
    await redis2.del(key);
  } catch {
    redisAvailable = false;
  }
}
async function setUserAllChannelsCache(userId, channelIds) {
  if (!await ensureRedisAvailable()) return;
  try {
    const redis2 = client;
    const key = `user:${userId}:allChannels`;
    await redis2.set(key, JSON.stringify(channelIds), "EX", 3600);
  } catch {
    redisAvailable = false;
  }
}
async function getUserAllChannelsCache(userId) {
  if (!await ensureRedisAvailable()) return null;
  try {
    const redis2 = client;
    const key = `user:${userId}:allChannels`;
    const result = await redis2.get(key);
    return result ? JSON.parse(result) : null;
  } catch {
    redisAvailable = false;
    return null;
  }
}
async function clearAllChannelCache() {
  if (!await ensureRedisAvailable()) return;
  try {
    const redis2 = client;
    const keys = await redis2.keys("user:*:channels");
    if (keys.length > 0) {
      await redis2.del(...keys);
    }
    const allChannelKeys = await redis2.keys("user:*:allChannels");
    if (allChannelKeys.length > 0) {
      await redis2.del(...allChannelKeys);
    }
    const roleKeys = await redis2.keys("role:*:channels");
    if (roleKeys.length > 0) {
      await redis2.del(...roleKeys);
    }
  } catch {
    redisAvailable = false;
  }
}
const redis = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  clearAllChannelCache,
  closeRedisClient,
  deleteRoleChannelCache,
  deleteUserAllChannelsCache,
  deleteUserChannelCache,
  getRedisClient,
  getRoleChannelCache,
  getUserAllChannelsCache,
  getUserChannelCache,
  setRoleChannelCache,
  setUserAllChannelsCache,
  setUserChannelCache
}, Symbol.toStringTag, { value: "Module" }));
const destroy = ({ strapi: _strapi }) => {
  closeRedisClient();
  closeBatchGrantQueue();
};
const ssoAppAuth = async (policyContext, config2, { strapi }) => {
  const appCode = policyContext.request?.headers?.["x-app-code"];
  const timestamp = policyContext.request?.headers?.["x-timestamp"];
  const signature = policyContext.request?.headers?.["x-signature"];
  if (!appCode || !timestamp || !signature) {
    return false;
  }
  const now = Date.now();
  const ts = Number(timestamp);
  if (isNaN(ts) || Math.abs(now - ts) > 5 * 60 * 1e3) {
    return false;
  }
  let appSecret;
  try {
    const ssoApp = await strapi.db.query("plugin::zhao-sso.sso-app").findOne({
      where: { app_code: appCode }
    });
    if (ssoApp?.app_secret && ssoApp.is_active !== false) {
      appSecret = ssoApp.app_secret;
    }
  } catch {
  }
  if (!appSecret) {
    const ssoConfig = strapi.config.get("plugin::zhao-sso.channelSync") || strapi.plugin("zhao-sso")?.config("channelSync");
    if (ssoConfig?.appCode === appCode && ssoConfig?.appSecret) {
      appSecret = ssoConfig.appSecret;
    }
  }
  if (!appSecret) {
    return false;
  }
  const body = policyContext.request?.body ? JSON.stringify(policyContext.request.body) : "";
  const expectedSig = crypto.createHmac("sha256", appSecret).update(`${appCode}${timestamp}${body}`).digest("hex");
  if (signature !== expectedSig) {
    return false;
  }
  policyContext.state.appCode = appCode;
  return true;
};
const register = ({ strapi }) => {
  strapi.server.use(async (ctx, next) => {
    await runWithContext(ctx.url, () => next());
  });
  const policyRegistry = strapi.get("policies");
  policyRegistry.add("plugin::zhao-channel", {
    "sso-app-auth": ssoAppAuth
  });
  strapi.log.info("[zhao-channel] 渠道权限策略已注册到 zhao-auth");
};
const config$1 = {
  default: {},
  validator() {
  }
};
const TIER_HIERARCHY = {
  root: ["core", "senior", "global", "authorized", "official", "partner", "agent"],
  core: ["national"],
  senior: ["national"],
  global: ["national"],
  authorized: ["national"],
  official: ["national"],
  partner: ["national"],
  agent: ["national"],
  national: ["regional"],
  regional: ["city"],
  city: ["county"],
  county: ["local"],
  local: ["store"],
  store: []
  // 叶子节点
};
const ROOT_TIER = "root";
const MAX_CHANNEL_DEPTH = 7;
function getAllTiers() {
  return Object.keys(TIER_HIERARCHY);
}
function getChildTiers(parentTier) {
  return TIER_HIERARCHY[parentTier] || [];
}
function getOnlyChildTier(parentTier) {
  const children = getChildTiers(parentTier);
  return children.length === 1 ? children[0] : null;
}
function isLeafTier(tier) {
  return getChildTiers(tier).length === 0;
}
function validateTier(tier) {
  return tier in TIER_HIERARCHY;
}
function getTierTree(parentTier) {
  return getChildTiers(parentTier).map((child) => ({
    tier: child,
    children: getTierTree(child)
  }));
}
const contentTypes = {
  channel: {
    schema: {
      kind: "collectionType",
      collectionName: "zhao_channels",
      info: {
        singularName: "channel",
        pluralName: "channels",
        displayName: "Channel",
        description: "渠道"
      },
      options: {
        draftAndPublish: false
      },
      attributes: {
        name: {
          type: "string",
          required: true,
          maxLength: 100
        },
        code: {
          type: "string",
          required: true,
          unique: true,
          maxLength: 32
        },
        channelTier: {
          type: "enumeration",
          enum: getAllTiers(),
          default: "store",
          required: true
        },
        parentChannel: {
          type: "relation",
          relation: "manyToOne",
          target: "plugin::zhao-channel.channel",
          inversedBy: "childChannels"
        },
        childChannels: {
          type: "relation",
          relation: "oneToMany",
          target: "plugin::zhao-channel.channel",
          mappedBy: "parentChannel"
        },
        sites: {
          type: "relation",
          relation: "manyToMany",
          target: "plugin::zhao-common.site-config",
          inversedBy: "channels"
        },
        members: {
          type: "relation",
          relation: "oneToMany",
          target: "plugin::zhao-channel.channel-member",
          mappedBy: "channel"
        },
        status: {
          type: "boolean",
          default: true
        },
        description: {
          type: "text"
        },
        path: {
          type: "text"
        },
        depth: {
          type: "integer",
          default: 0,
          min: 0,
          max: MAX_CHANNEL_DEPTH
        },
        extraConfig: {
          type: "json",
          default: "{}"
        }
      }
    }
  },
  "channel-member": {
    schema: {
      kind: "collectionType",
      collectionName: "zhao_channel_members",
      info: {
        singularName: "channel-member",
        pluralName: "channel-members",
        displayName: "Channel Member",
        description: "渠道成员关联"
      },
      options: {
        draftAndPublish: false
      },
      attributes: {
        channel: {
          type: "relation",
          relation: "manyToOne",
          target: "plugin::zhao-channel.channel",
          inversedBy: "members",
          required: true
        },
        user: {
          type: "relation",
          relation: "manyToOne",
          target: "plugin::users-permissions.user",
          required: true
        },
        role: {
          type: "enumeration",
          enum: ["owner", "admin", "member"],
          default: "member",
          required: true
        },
        invitedBy: {
          type: "relation",
          relation: "manyToOne",
          target: "plugin::users-permissions.user"
        },
        "isCurrent": {
          "type": "boolean",
          "default": false
        }
      }
    }
  },
  "user-channel": {
    schema: {
      kind: "collectionType",
      collectionName: "zhao_user_channels",
      info: {
        singularName: "user-channel",
        pluralName: "user-channels",
        displayName: "User Channel",
        description: "用户-渠道关联"
      },
      options: {
        draftAndPublish: false
      },
      attributes: {
        user: {
          type: "relation",
          relation: "manyToOne",
          target: "plugin::users-permissions.user",
          required: true
        },
        channel: {
          type: "relation",
          relation: "manyToOne",
          target: "plugin::zhao-channel.channel",
          required: true
        },
        grantedBy: {
          type: "relation",
          relation: "manyToOne",
          target: "plugin::users-permissions.user"
        },
        grantedAt: {
          type: "datetime"
        }
      }
    }
  },
  "user-invite": {
    schema: {
      kind: "collectionType",
      collectionName: "zhao_user_invites",
      info: {
        singularName: "user-invite",
        pluralName: "user-invites",
        displayName: "User Invite",
        description: "用户邀请码与分销链信息"
      },
      options: {
        draftAndPublish: false
      },
      attributes: {
        user: {
          type: "relation",
          relation: "oneToOne",
          target: "plugin::users-permissions.user",
          required: true,
          unique: true
        },
        inviteCode: {
          type: "string",
          unique: true,
          required: true,
          maxLength: 16
        },
        invitedBy: {
          type: "relation",
          relation: "manyToOne",
          target: "plugin::users-permissions.user"
        },
        inviteChannel: {
          type: "relation",
          relation: "manyToOne",
          target: "plugin::zhao-channel.channel"
        },
        inviteMethod: {
          type: "enumeration",
          enum: ["invite_code", "organic"],
          default: "organic"
        },
        distributionPath: {
          type: "text"
        },
        distributionDepth: {
          type: "integer",
          default: 0,
          min: 0,
          max: 2
        },
        used: {
          type: "boolean",
          default: false
        },
        expiresAt: {
          type: "datetime"
        }
      }
    }
  }
};
var _a$1;
function $constructor(name, initializer2, params) {
  function init(inst, def) {
    if (!inst._zod) {
      Object.defineProperty(inst, "_zod", {
        value: {
          def,
          constr: _,
          traits: /* @__PURE__ */ new Set()
        },
        enumerable: false
      });
    }
    if (inst._zod.traits.has(name)) {
      return;
    }
    inst._zod.traits.add(name);
    initializer2(inst, def);
    const proto = _.prototype;
    const keys = Object.keys(proto);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (!(k in inst)) {
        inst[k] = proto[k].bind(inst);
      }
    }
  }
  const Parent = params?.Parent ?? Object;
  class Definition extends Parent {
  }
  Object.defineProperty(Definition, "name", { value: name });
  function _(def) {
    var _a2;
    const inst = params?.Parent ? new Definition() : this;
    init(inst, def);
    (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
    for (const fn of inst._zod.deferred) {
      fn();
    }
    return inst;
  }
  Object.defineProperty(_, "init", { value: init });
  Object.defineProperty(_, Symbol.hasInstance, {
    value: (inst) => {
      if (params?.Parent && inst instanceof params.Parent)
        return true;
      return inst?._zod?.traits?.has(name);
    }
  });
  Object.defineProperty(_, "name", { value: name });
  return _;
}
class $ZodAsyncError extends Error {
  constructor() {
    super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
  }
}
class $ZodEncodeError extends Error {
  constructor(name) {
    super(`Encountered unidirectional transform during encode: ${name}`);
    this.name = "ZodEncodeError";
  }
}
(_a$1 = globalThis).__zod_globalConfig ?? (_a$1.__zod_globalConfig = {});
const globalConfig = globalThis.__zod_globalConfig;
function config(newConfig) {
  return globalConfig;
}
function getEnumValues(entries) {
  const numericValues = Object.values(entries).filter((v) => typeof v === "number");
  const values = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
  return values;
}
function jsonStringifyReplacer(_, value) {
  if (typeof value === "bigint")
    return value.toString();
  return value;
}
function cached(getter) {
  return {
    get value() {
      {
        const value = getter();
        Object.defineProperty(this, "value", { value });
        return value;
      }
    }
  };
}
function nullish(input) {
  return input === null || input === void 0;
}
function cleanRegex(source) {
  const start = source.startsWith("^") ? 1 : 0;
  const end = source.endsWith("$") ? source.length - 1 : source.length;
  return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
  const ratio = val / step;
  const roundedRatio = Math.round(ratio);
  const tolerance = Number.EPSILON * Math.max(Math.abs(ratio), 1);
  if (Math.abs(ratio - roundedRatio) < tolerance)
    return 0;
  return ratio - roundedRatio;
}
const EVALUATING = /* @__PURE__ */ Symbol("evaluating");
function defineLazy(object2, key, getter) {
  let value = void 0;
  Object.defineProperty(object2, key, {
    get() {
      if (value === EVALUATING) {
        return void 0;
      }
      if (value === void 0) {
        value = EVALUATING;
        value = getter();
      }
      return value;
    },
    set(v) {
      Object.defineProperty(object2, key, {
        value: v
        // configurable: true,
      });
    },
    configurable: true
  });
}
function assignProp(target, prop, value) {
  Object.defineProperty(target, prop, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}
function mergeDefs(...defs) {
  const mergedDescriptors = {};
  for (const def of defs) {
    const descriptors = Object.getOwnPropertyDescriptors(def);
    Object.assign(mergedDescriptors, descriptors);
  }
  return Object.defineProperties({}, mergedDescriptors);
}
function esc(str) {
  return JSON.stringify(str);
}
function slugify(input) {
  return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
const captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {
};
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
const allowsEval = /* @__PURE__ */ cached(() => {
  if (globalConfig.jitless) {
    return false;
  }
  if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) {
    return false;
  }
  try {
    const F = Function;
    new F("");
    return true;
  } catch (_) {
    return false;
  }
});
function isPlainObject(o) {
  if (isObject(o) === false)
    return false;
  const ctor = o.constructor;
  if (ctor === void 0)
    return true;
  if (typeof ctor !== "function")
    return true;
  const prot = ctor.prototype;
  if (isObject(prot) === false)
    return false;
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
    return false;
  }
  return true;
}
function shallowClone(o) {
  if (isPlainObject(o))
    return { ...o };
  if (Array.isArray(o))
    return [...o];
  if (o instanceof Map)
    return new Map(o);
  if (o instanceof Set)
    return new Set(o);
  return o;
}
const propertyKeyTypes = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
  const cl = new inst._zod.constr(def ?? inst._zod.def);
  if (!def || params?.parent)
    cl._zod.parent = inst;
  return cl;
}
function normalizeParams(_params) {
  const params = _params;
  if (!params)
    return {};
  if (typeof params === "string")
    return { error: () => params };
  if (params?.message !== void 0) {
    if (params?.error !== void 0)
      throw new Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return { ...params, error: () => params.error };
  return params;
}
function optionalKeys(shape) {
  return Object.keys(shape).filter((k) => {
    return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
  });
}
const NUMBER_FORMAT_RANGES = {
  safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  int32: [-2147483648, 2147483647],
  uint32: [0, 4294967295],
  float32: [-34028234663852886e22, 34028234663852886e22],
  float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
function pick(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".pick() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = {};
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        newShape[key] = currDef.shape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function omit(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".omit() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = { ...schema._zod.def.shape };
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        delete newShape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function extend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to extend: expected a plain object");
  }
  const checks = schema._zod.def.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    const existingShape = schema._zod.def.shape;
    for (const key in shape) {
      if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) {
        throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
      }
    }
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    }
  });
  return clone(schema, def);
}
function safeExtend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to safeExtend: expected a plain object");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    }
  });
  return clone(schema, def);
}
function merge(a, b) {
  if (a._zod.def.checks?.length) {
    throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
  }
  const def = mergeDefs(a._zod.def, {
    get shape() {
      const _shape = { ...a._zod.def.shape, ...b._zod.def.shape };
      assignProp(this, "shape", _shape);
      return _shape;
    },
    get catchall() {
      return b._zod.def.catchall;
    },
    checks: b._zod.def.checks ?? []
  });
  return clone(a, def);
}
function partial(Class, schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".partial() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in oldShape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = Class ? new Class({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      } else {
        for (const key in oldShape) {
          shape[key] = Class ? new Class({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    },
    checks: []
  });
  return clone(schema, def);
}
function required(Class, schema, mask) {
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in shape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = new Class({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      } else {
        for (const key in oldShape) {
          shape[key] = new Class({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    }
  });
  return clone(schema, def);
}
function aborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex; i < x.issues.length; i++) {
    if (x.issues[i]?.continue !== true) {
      return true;
    }
  }
  return false;
}
function explicitlyAborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex; i < x.issues.length; i++) {
    if (x.issues[i]?.continue === false) {
      return true;
    }
  }
  return false;
}
function prefixIssues(path2, issues) {
  return issues.map((iss) => {
    var _a2;
    (_a2 = iss).path ?? (_a2.path = []);
    iss.path.unshift(path2);
    return iss;
  });
}
function unwrapMessage(message) {
  return typeof message === "string" ? message : message?.message;
}
function finalizeIssue(iss, ctx, config2) {
  const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config2.customError?.(iss)) ?? unwrapMessage(config2.localeError?.(iss)) ?? "Invalid input";
  const { inst: _inst, continue: _continue, input: _input, ...rest } = iss;
  rest.path ?? (rest.path = []);
  rest.message = message;
  if (ctx?.reportInput) {
    rest.input = _input;
  }
  return rest;
}
function getLengthableOrigin(input) {
  if (Array.isArray(input))
    return "array";
  if (typeof input === "string")
    return "string";
  return "unknown";
}
function issue(...args) {
  const [iss, input, inst] = args;
  if (typeof iss === "string") {
    return {
      message: iss,
      code: "custom",
      input,
      inst
    };
  }
  return { ...iss };
}
const initializer$1 = (inst, def) => {
  inst.name = "$ZodError";
  Object.defineProperty(inst, "_zod", {
    value: inst._zod,
    enumerable: false
  });
  Object.defineProperty(inst, "issues", {
    value: def,
    enumerable: false
  });
  inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
  Object.defineProperty(inst, "toString", {
    value: () => inst.message,
    enumerable: false
  });
};
const $ZodError = $constructor("$ZodError", initializer$1);
const $ZodRealError = $constructor("$ZodError", initializer$1, { Parent: Error });
function flattenError(error, mapper = (issue2) => issue2.message) {
  const fieldErrors = {};
  const formErrors = [];
  for (const sub of error.issues) {
    if (sub.path.length > 0) {
      fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
      fieldErrors[sub.path[0]].push(mapper(sub));
    } else {
      formErrors.push(mapper(sub));
    }
  }
  return { formErrors, fieldErrors };
}
function formatError(error, mapper = (issue2) => issue2.message) {
  const fieldErrors = { _errors: [] };
  const processError = (error2, path2 = []) => {
    for (const issue2 of error2.issues) {
      if (issue2.code === "invalid_union" && issue2.errors.length) {
        issue2.errors.map((issues) => processError({ issues }, [...path2, ...issue2.path]));
      } else if (issue2.code === "invalid_key") {
        processError({ issues: issue2.issues }, [...path2, ...issue2.path]);
      } else if (issue2.code === "invalid_element") {
        processError({ issues: issue2.issues }, [...path2, ...issue2.path]);
      } else {
        const fullpath = [...path2, ...issue2.path];
        if (fullpath.length === 0) {
          fieldErrors._errors.push(mapper(issue2));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < fullpath.length) {
            const el = fullpath[i];
            const terminal = i === fullpath.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue2));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    }
  };
  processError(error);
  return fieldErrors;
}
const _parse = (_Err) => (schema, value, _ctx, _params) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  if (result.issues.length) {
    const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, _params?.callee);
    throw e;
  }
  return result.value;
};
const _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
  const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  if (result.issues.length) {
    const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, params?.callee);
    throw e;
  }
  return result.value;
};
const _safeParse = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  return result.issues.length ? {
    success: false,
    error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
const safeParse$1 = /* @__PURE__ */ _safeParse($ZodRealError);
const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length ? {
    success: false,
    error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
const safeParseAsync$1 = /* @__PURE__ */ _safeParseAsync($ZodRealError);
const _encode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _parse(_Err)(schema, value, ctx);
};
const _decode = (_Err) => (schema, value, _ctx) => {
  return _parse(_Err)(schema, value, _ctx);
};
const _encodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _parseAsync(_Err)(schema, value, ctx);
};
const _decodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _parseAsync(_Err)(schema, value, _ctx);
};
const _safeEncode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _safeParse(_Err)(schema, value, ctx);
};
const _safeDecode = (_Err) => (schema, value, _ctx) => {
  return _safeParse(_Err)(schema, value, _ctx);
};
const _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _safeParseAsync(_Err)(schema, value, ctx);
};
const _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _safeParseAsync(_Err)(schema, value, _ctx);
};
const cuid = /^[cC][0-9a-z]{6,}$/;
const cuid2 = /^[0-9a-z]+$/;
const ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
const xid = /^[0-9a-vA-V]{20}$/;
const ksuid = /^[A-Za-z0-9]{27}$/;
const nanoid = /^[a-zA-Z0-9_-]{21}$/;
const duration$1 = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
const guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
const uuid = (version2) => {
  if (!version2)
    return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
  return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version2}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
};
const email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
const _emoji$1 = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
function emoji() {
  return new RegExp(_emoji$1, "u");
}
const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
const cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
const cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
const base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
const base64url = /^[A-Za-z0-9_-]*$/;
const httpProtocol = /^https?$/;
const e164 = /^\+[1-9]\d{6,14}$/;
const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
const date$1 = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
function timeSource(args) {
  const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
  const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
  return regex;
}
function time$1(args) {
  return new RegExp(`^${timeSource(args)}$`);
}
function datetime$1(args) {
  const time2 = timeSource({ precision: args.precision });
  const opts = ["Z"];
  if (args.local)
    opts.push("");
  if (args.offset)
    opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
  const timeRegex = `${time2}(?:${opts.join("|")})`;
  return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
const string$1 = (params) => {
  const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
  return new RegExp(`^${regex}$`);
};
const integer = /^-?\d+$/;
const number$2 = /^-?\d+(?:\.\d+)?$/;
const lowercase = /^[^A-Z]*$/;
const uppercase = /^[^a-z]*$/;
const $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
  var _a2;
  inst._zod ?? (inst._zod = {});
  inst._zod.def = def;
  (_a2 = inst._zod).onattach ?? (_a2.onattach = []);
});
const numericOriginMap = {
  number: "number",
  bigint: "bigint",
  object: "date"
};
const $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
    if (def.value < curr) {
      if (def.inclusive)
        bag.maximum = def.value;
      else
        bag.exclusiveMaximum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
    if (def.value > curr) {
      if (def.inclusive)
        bag.minimum = def.value;
      else
        bag.exclusiveMinimum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    var _a2;
    (_a2 = inst2._zod.bag).multipleOf ?? (_a2.multipleOf = def.value);
  });
  inst._zod.check = (payload) => {
    if (typeof payload.value !== typeof def.value)
      throw new Error("Cannot mix number and bigint in multiple_of check.");
    const isMultiple = typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0;
    if (isMultiple)
      return;
    payload.issues.push({
      origin: typeof payload.value,
      code: "not_multiple_of",
      divisor: def.value,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
  $ZodCheck.init(inst, def);
  def.format = def.format || "float64";
  const isInt = def.format?.includes("int");
  const origin = isInt ? "int" : "number";
  const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    bag.minimum = minimum;
    bag.maximum = maximum;
    if (isInt)
      bag.pattern = integer;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    if (isInt) {
      if (!Number.isInteger(input)) {
        payload.issues.push({
          expected: origin,
          format: def.format,
          code: "invalid_type",
          continue: false,
          input,
          inst
        });
        return;
      }
      if (!Number.isSafeInteger(input)) {
        if (input > 0) {
          payload.issues.push({
            input,
            code: "too_big",
            maximum: Number.MAX_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort
          });
        } else {
          payload.issues.push({
            input,
            code: "too_small",
            minimum: Number.MIN_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort
          });
        }
        return;
      }
    }
    if (input < minimum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_small",
        minimum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
    if (input > maximum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_big",
        maximum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
  };
});
const $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
  var _a2;
  $ZodCheck.init(inst, def);
  (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
    if (def.maximum < curr)
      inst2._zod.bag.maximum = def.maximum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length <= def.maximum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: def.maximum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
  var _a2;
  $ZodCheck.init(inst, def);
  (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
    if (def.minimum > curr)
      inst2._zod.bag.minimum = def.minimum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length >= def.minimum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: def.minimum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
  var _a2;
  $ZodCheck.init(inst, def);
  (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.minimum = def.length;
    bag.maximum = def.length;
    bag.length = def.length;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length === def.length)
      return;
    const origin = getLengthableOrigin(input);
    const tooBig = length > def.length;
    payload.issues.push({
      origin,
      ...tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length },
      inclusive: true,
      exact: true,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
  var _a2, _b;
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    if (def.pattern) {
      bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
      bag.patterns.add(def.pattern);
    }
  });
  if (def.pattern)
    (_a2 = inst._zod).check ?? (_a2.check = (payload) => {
      def.pattern.lastIndex = 0;
      if (def.pattern.test(payload.value))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: def.format,
        input: payload.value,
        ...def.pattern ? { pattern: def.pattern.toString() } : {},
        inst,
        continue: !def.abort
      });
    });
  else
    (_b = inst._zod).check ?? (_b.check = () => {
    });
});
const $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    def.pattern.lastIndex = 0;
    if (def.pattern.test(payload.value))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "regex",
      input: payload.value,
      pattern: def.pattern.toString(),
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
  def.pattern ?? (def.pattern = lowercase);
  $ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
  def.pattern ?? (def.pattern = uppercase);
  $ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
  $ZodCheck.init(inst, def);
  const escapedRegex = escapeRegex(def.includes);
  const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
  def.pattern = pattern;
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.includes(def.includes, def.position))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "includes",
      includes: def.includes,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
  $ZodCheck.init(inst, def);
  const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
  def.pattern ?? (def.pattern = pattern);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.startsWith(def.prefix))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "starts_with",
      prefix: def.prefix,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
  $ZodCheck.init(inst, def);
  const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
  def.pattern ?? (def.pattern = pattern);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.endsWith(def.suffix))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "ends_with",
      suffix: def.suffix,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.check = (payload) => {
    payload.value = def.tx(payload.value);
  };
});
class Doc {
  constructor(args = []) {
    this.content = [];
    this.indent = 0;
    if (this)
      this.args = args;
  }
  indented(fn) {
    this.indent += 1;
    fn(this);
    this.indent -= 1;
  }
  write(arg) {
    if (typeof arg === "function") {
      arg(this, { execution: "sync" });
      arg(this, { execution: "async" });
      return;
    }
    const content = arg;
    const lines = content.split("\n").filter((x) => x);
    const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
    const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
    for (const line of dedented) {
      this.content.push(line);
    }
  }
  compile() {
    const F = Function;
    const args = this?.args;
    const content = this?.content ?? [``];
    const lines = [...content.map((x) => `  ${x}`)];
    return new F(...args, lines.join("\n"));
  }
}
const version = {
  major: 4,
  minor: 4,
  patch: 3
};
const $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
  var _a2;
  inst ?? (inst = {});
  inst._zod.def = def;
  inst._zod.bag = inst._zod.bag || {};
  inst._zod.version = version;
  const checks = [...inst._zod.def.checks ?? []];
  if (inst._zod.traits.has("$ZodCheck")) {
    checks.unshift(inst);
  }
  for (const ch of checks) {
    for (const fn of ch._zod.onattach) {
      fn(inst);
    }
  }
  if (checks.length === 0) {
    (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
    inst._zod.deferred?.push(() => {
      inst._zod.run = inst._zod.parse;
    });
  } else {
    const runChecks = (payload, checks2, ctx) => {
      let isAborted = aborted(payload);
      let asyncResult;
      for (const ch of checks2) {
        if (ch._zod.def.when) {
          if (explicitlyAborted(payload))
            continue;
          const shouldRun = ch._zod.def.when(payload);
          if (!shouldRun)
            continue;
        } else if (isAborted) {
          continue;
        }
        const currLen = payload.issues.length;
        const _ = ch._zod.check(payload);
        if (_ instanceof Promise && ctx?.async === false) {
          throw new $ZodAsyncError();
        }
        if (asyncResult || _ instanceof Promise) {
          asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
            await _;
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              return;
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          });
        } else {
          const nextLen = payload.issues.length;
          if (nextLen === currLen)
            continue;
          if (!isAborted)
            isAborted = aborted(payload, currLen);
        }
      }
      if (asyncResult) {
        return asyncResult.then(() => {
          return payload;
        });
      }
      return payload;
    };
    const handleCanaryResult = (canary, payload, ctx) => {
      if (aborted(canary)) {
        canary.aborted = true;
        return canary;
      }
      const checkResult = runChecks(payload, checks, ctx);
      if (checkResult instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
      }
      return inst._zod.parse(checkResult, ctx);
    };
    inst._zod.run = (payload, ctx) => {
      if (ctx.skipChecks) {
        return inst._zod.parse(payload, ctx);
      }
      if (ctx.direction === "backward") {
        const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
        if (canary instanceof Promise) {
          return canary.then((canary2) => {
            return handleCanaryResult(canary2, payload, ctx);
          });
        }
        return handleCanaryResult(canary, payload, ctx);
      }
      const result = inst._zod.parse(payload, ctx);
      if (result instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return result.then((result2) => runChecks(result2, checks, ctx));
      }
      return runChecks(result, checks, ctx);
    };
  }
  defineLazy(inst, "~standard", () => ({
    validate: (value) => {
      try {
        const r = safeParse$1(inst, value);
        return r.success ? { value: r.data } : { issues: r.error?.issues };
      } catch (_) {
        return safeParseAsync$1(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
      }
    },
    vendor: "zod",
    version: 1
  }));
});
const $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string$1(inst._zod.bag);
  inst._zod.parse = (payload, _) => {
    if (def.coerce)
      try {
        payload.value = String(payload.value);
      } catch (_2) {
      }
    if (typeof payload.value === "string")
      return payload;
    payload.issues.push({
      expected: "string",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
const $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  $ZodString.init(inst, def);
});
const $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
  def.pattern ?? (def.pattern = guid);
  $ZodStringFormat.init(inst, def);
});
const $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
  if (def.version) {
    const versionMap = {
      v1: 1,
      v2: 2,
      v3: 3,
      v4: 4,
      v5: 5,
      v6: 6,
      v7: 7,
      v8: 8
    };
    const v = versionMap[def.version];
    if (v === void 0)
      throw new Error(`Invalid UUID version: "${def.version}"`);
    def.pattern ?? (def.pattern = uuid(v));
  } else
    def.pattern ?? (def.pattern = uuid());
  $ZodStringFormat.init(inst, def);
});
const $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
  def.pattern ?? (def.pattern = email);
  $ZodStringFormat.init(inst, def);
});
const $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    try {
      const trimmed = payload.value.trim();
      if (!def.normalize && def.protocol?.source === httpProtocol.source) {
        if (!/^https?:\/\//i.test(trimmed)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid URL format",
            input: payload.value,
            inst,
            continue: !def.abort
          });
          return;
        }
      }
      const url = new URL(trimmed);
      if (def.hostname) {
        def.hostname.lastIndex = 0;
        if (!def.hostname.test(url.hostname)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid hostname",
            pattern: def.hostname.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      }
      if (def.protocol) {
        def.protocol.lastIndex = 0;
        if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid protocol",
            pattern: def.protocol.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      }
      if (def.normalize) {
        payload.value = url.href;
      } else {
        payload.value = trimmed;
      }
      return;
    } catch (_) {
      payload.issues.push({
        code: "invalid_format",
        format: "url",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
const $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
  def.pattern ?? (def.pattern = emoji());
  $ZodStringFormat.init(inst, def);
});
const $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
  def.pattern ?? (def.pattern = nanoid);
  $ZodStringFormat.init(inst, def);
});
const $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
  def.pattern ?? (def.pattern = cuid);
  $ZodStringFormat.init(inst, def);
});
const $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
  def.pattern ?? (def.pattern = cuid2);
  $ZodStringFormat.init(inst, def);
});
const $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
  def.pattern ?? (def.pattern = ulid);
  $ZodStringFormat.init(inst, def);
});
const $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
  def.pattern ?? (def.pattern = xid);
  $ZodStringFormat.init(inst, def);
});
const $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
  def.pattern ?? (def.pattern = ksuid);
  $ZodStringFormat.init(inst, def);
});
const $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
  def.pattern ?? (def.pattern = datetime$1(def));
  $ZodStringFormat.init(inst, def);
});
const $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
  def.pattern ?? (def.pattern = date$1);
  $ZodStringFormat.init(inst, def);
});
const $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
  def.pattern ?? (def.pattern = time$1(def));
  $ZodStringFormat.init(inst, def);
});
const $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
  def.pattern ?? (def.pattern = duration$1);
  $ZodStringFormat.init(inst, def);
});
const $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
  def.pattern ?? (def.pattern = ipv4);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.format = `ipv4`;
});
const $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
  def.pattern ?? (def.pattern = ipv6);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.format = `ipv6`;
  inst._zod.check = (payload) => {
    try {
      new URL(`http://[${payload.value}]`);
    } catch {
      payload.issues.push({
        code: "invalid_format",
        format: "ipv6",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
const $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
  def.pattern ?? (def.pattern = cidrv4);
  $ZodStringFormat.init(inst, def);
});
const $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
  def.pattern ?? (def.pattern = cidrv6);
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    const parts = payload.value.split("/");
    try {
      if (parts.length !== 2)
        throw new Error();
      const [address, prefix] = parts;
      if (!prefix)
        throw new Error();
      const prefixNum = Number(prefix);
      if (`${prefixNum}` !== prefix)
        throw new Error();
      if (prefixNum < 0 || prefixNum > 128)
        throw new Error();
      new URL(`http://[${address}]`);
    } catch {
      payload.issues.push({
        code: "invalid_format",
        format: "cidrv6",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
function isValidBase64(data) {
  if (data === "")
    return true;
  if (/\s/.test(data))
    return false;
  if (data.length % 4 !== 0)
    return false;
  try {
    atob(data);
    return true;
  } catch {
    return false;
  }
}
const $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
  def.pattern ?? (def.pattern = base64);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.contentEncoding = "base64";
  inst._zod.check = (payload) => {
    if (isValidBase64(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "base64",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
function isValidBase64URL(data) {
  if (!base64url.test(data))
    return false;
  const base642 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
  const padded = base642.padEnd(Math.ceil(base642.length / 4) * 4, "=");
  return isValidBase64(padded);
}
const $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
  def.pattern ?? (def.pattern = base64url);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.contentEncoding = "base64url";
  inst._zod.check = (payload) => {
    if (isValidBase64URL(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "base64url",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
  def.pattern ?? (def.pattern = e164);
  $ZodStringFormat.init(inst, def);
});
function isValidJWT(token, algorithm = null) {
  try {
    const tokensParts = token.split(".");
    if (tokensParts.length !== 3)
      return false;
    const [header] = tokensParts;
    if (!header)
      return false;
    const parsedHeader = JSON.parse(atob(header));
    if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT")
      return false;
    if (!parsedHeader.alg)
      return false;
    if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
      return false;
    return true;
  } catch {
    return false;
  }
}
const $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    if (isValidJWT(payload.value, def.alg))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "jwt",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = inst._zod.bag.pattern ?? number$2;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Number(payload.value);
      } catch (_) {
      }
    const input = payload.value;
    if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
      return payload;
    }
    const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
    payload.issues.push({
      expected: "number",
      code: "invalid_type",
      input,
      inst,
      ...received ? { received } : {}
    });
    return payload;
  };
});
const $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumberFormat", (inst, def) => {
  $ZodCheckNumberFormat.init(inst, def);
  $ZodNumber.init(inst, def);
});
const $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload) => payload;
});
const $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    payload.issues.push({
      expected: "never",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
function handleArrayResult(result, final, index2) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index2, result.issues));
  }
  final.value[index2] = result.value;
}
const $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!Array.isArray(input)) {
      payload.issues.push({
        expected: "array",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = Array(input.length);
    const proms = [];
    for (let i = 0; i < input.length; i++) {
      const item = input[i];
      const result = def.element._zod.run({
        value: item,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
      } else {
        handleArrayResult(result, payload, i);
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
function handlePropertyResult(result, final, key, input, isOptionalIn, isOptionalOut) {
  const isPresent = key in input;
  if (result.issues.length) {
    if (isOptionalIn && isOptionalOut && !isPresent) {
      return;
    }
    final.issues.push(...prefixIssues(key, result.issues));
  }
  if (!isPresent && !isOptionalIn) {
    if (!result.issues.length) {
      final.issues.push({
        code: "invalid_type",
        expected: "nonoptional",
        input: void 0,
        path: [key]
      });
    }
    return;
  }
  if (result.value === void 0) {
    if (isPresent) {
      final.value[key] = void 0;
    }
  } else {
    final.value[key] = result.value;
  }
}
function normalizeDef(def) {
  const keys = Object.keys(def.shape);
  for (const k of keys) {
    if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
      throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
    }
  }
  const okeys = optionalKeys(def.shape);
  return {
    ...def,
    keys,
    keySet: new Set(keys),
    numKeys: keys.length,
    optionalKeys: new Set(okeys)
  };
}
function handleCatchall(proms, input, payload, ctx, def, inst) {
  const unrecognized = [];
  const keySet = def.keySet;
  const _catchall = def.catchall._zod;
  const t = _catchall.def.type;
  const isOptionalIn = _catchall.optin === "optional";
  const isOptionalOut = _catchall.optout === "optional";
  for (const key in input) {
    if (key === "__proto__")
      continue;
    if (keySet.has(key))
      continue;
    if (t === "never") {
      unrecognized.push(key);
      continue;
    }
    const r = _catchall.run({ value: input[key], issues: [] }, ctx);
    if (r instanceof Promise) {
      proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, isOptionalIn, isOptionalOut)));
    } else {
      handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
    }
  }
  if (unrecognized.length) {
    payload.issues.push({
      code: "unrecognized_keys",
      keys: unrecognized,
      input,
      inst
    });
  }
  if (!proms.length)
    return payload;
  return Promise.all(proms).then(() => {
    return payload;
  });
}
const $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
  $ZodType.init(inst, def);
  const desc = Object.getOwnPropertyDescriptor(def, "shape");
  if (!desc?.get) {
    const sh = def.shape;
    Object.defineProperty(def, "shape", {
      get: () => {
        const newSh = { ...sh };
        Object.defineProperty(def, "shape", {
          value: newSh
        });
        return newSh;
      }
    });
  }
  const _normalized = cached(() => normalizeDef(def));
  defineLazy(inst._zod, "propValues", () => {
    const shape = def.shape;
    const propValues = {};
    for (const key in shape) {
      const field = shape[key]._zod;
      if (field.values) {
        propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
        for (const v of field.values)
          propValues[key].add(v);
      }
    }
    return propValues;
  });
  const isObject$1 = isObject;
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    const input = payload.value;
    if (!isObject$1(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = {};
    const proms = [];
    const shape = value.shape;
    for (const key of value.keys) {
      const el = shape[key];
      const isOptionalIn = el._zod.optin === "optional";
      const isOptionalOut = el._zod.optout === "optional";
      const r = el._zod.run({ value: input[key], issues: [] }, ctx);
      if (r instanceof Promise) {
        proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, isOptionalIn, isOptionalOut)));
      } else {
        handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
      }
    }
    if (!catchall) {
      return proms.length ? Promise.all(proms).then(() => payload) : payload;
    }
    return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
  };
});
const $ZodObjectJIT = /* @__PURE__ */ $constructor("$ZodObjectJIT", (inst, def) => {
  $ZodObject.init(inst, def);
  const superParse = inst._zod.parse;
  const _normalized = cached(() => normalizeDef(def));
  const generateFastpass = (shape) => {
    const doc = new Doc(["shape", "payload", "ctx"]);
    const normalized = _normalized.value;
    const parseStr = (key) => {
      const k = esc(key);
      return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
    };
    doc.write(`const input = payload.value;`);
    const ids = /* @__PURE__ */ Object.create(null);
    let counter = 0;
    for (const key of normalized.keys) {
      ids[key] = `key_${counter++}`;
    }
    doc.write(`const newResult = {};`);
    for (const key of normalized.keys) {
      const id = ids[key];
      const k = esc(key);
      const schema = shape[key];
      const isOptionalIn = schema?._zod?.optin === "optional";
      const isOptionalOut = schema?._zod?.optout === "optional";
      doc.write(`const ${id} = ${parseStr(key)};`);
      if (isOptionalIn && isOptionalOut) {
        doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
      } else if (!isOptionalIn) {
        doc.write(`
        const ${id}_present = ${k} in input;
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
        }

        if (${id}_present) {
          if (${id}.value === undefined) {
            newResult[${k}] = undefined;
          } else {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
      } else {
        doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
      }
    }
    doc.write(`payload.value = newResult;`);
    doc.write(`return payload;`);
    const fn = doc.compile();
    return (payload, ctx) => fn(shape, payload, ctx);
  };
  let fastpass;
  const isObject$1 = isObject;
  const jit = !globalConfig.jitless;
  const allowsEval$1 = allowsEval;
  const fastEnabled = jit && allowsEval$1.value;
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    const input = payload.value;
    if (!isObject$1(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
      if (!fastpass)
        fastpass = generateFastpass(def.shape);
      payload = fastpass(payload, ctx);
      if (!catchall)
        return payload;
      return handleCatchall([], input, payload, ctx, value, inst);
    }
    return superParse(payload, ctx);
  };
});
function handleUnionResults(results, final, inst, ctx) {
  for (const result of results) {
    if (result.issues.length === 0) {
      final.value = result.value;
      return final;
    }
  }
  const nonaborted = results.filter((r) => !aborted(r));
  if (nonaborted.length === 1) {
    final.value = nonaborted[0].value;
    return nonaborted[0];
  }
  final.issues.push({
    code: "invalid_union",
    input: final.value,
    inst,
    errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  });
  return final;
}
const $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
  defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
  defineLazy(inst._zod, "values", () => {
    if (def.options.every((o) => o._zod.values)) {
      return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
    }
    return void 0;
  });
  defineLazy(inst._zod, "pattern", () => {
    if (def.options.every((o) => o._zod.pattern)) {
      const patterns = def.options.map((o) => o._zod.pattern);
      return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
    }
    return void 0;
  });
  const first = def.options.length === 1 ? def.options[0]._zod.run : null;
  inst._zod.parse = (payload, ctx) => {
    if (first) {
      return first(payload, ctx);
    }
    let async = false;
    const results = [];
    for (const option of def.options) {
      const result = option._zod.run({
        value: payload.value,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        results.push(result);
        async = true;
      } else {
        if (result.issues.length === 0)
          return result;
        results.push(result);
      }
    }
    if (!async)
      return handleUnionResults(results, payload, inst, ctx);
    return Promise.all(results).then((results2) => {
      return handleUnionResults(results2, payload, inst, ctx);
    });
  };
});
const $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    const left = def.left._zod.run({ value: input, issues: [] }, ctx);
    const right = def.right._zod.run({ value: input, issues: [] }, ctx);
    const async = left instanceof Promise || right instanceof Promise;
    if (async) {
      return Promise.all([left, right]).then(([left2, right2]) => {
        return handleIntersectionResults(payload, left2, right2);
      });
    }
    return handleIntersectionResults(payload, left, right);
  };
});
function mergeValues(a, b) {
  if (a === b) {
    return { valid: true, data: a };
  }
  if (a instanceof Date && b instanceof Date && +a === +b) {
    return { valid: true, data: a };
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const bKeys = Object.keys(b);
    const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
        };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return { valid: false, mergeErrorPath: [] };
    }
    const newArray = [];
    for (let index2 = 0; index2 < a.length; index2++) {
      const itemA = a[index2];
      const itemB = b[index2];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [index2, ...sharedValue.mergeErrorPath]
        };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  }
  return { valid: false, mergeErrorPath: [] };
}
function handleIntersectionResults(result, left, right) {
  const unrecKeys = /* @__PURE__ */ new Map();
  let unrecIssue;
  for (const iss of left.issues) {
    if (iss.code === "unrecognized_keys") {
      unrecIssue ?? (unrecIssue = iss);
      for (const k of iss.keys) {
        if (!unrecKeys.has(k))
          unrecKeys.set(k, {});
        unrecKeys.get(k).l = true;
      }
    } else {
      result.issues.push(iss);
    }
  }
  for (const iss of right.issues) {
    if (iss.code === "unrecognized_keys") {
      for (const k of iss.keys) {
        if (!unrecKeys.has(k))
          unrecKeys.set(k, {});
        unrecKeys.get(k).r = true;
      }
    } else {
      result.issues.push(iss);
    }
  }
  const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
  if (bothKeys.length && unrecIssue) {
    result.issues.push({ ...unrecIssue, keys: bothKeys });
  }
  if (aborted(result))
    return result;
  const merged = mergeValues(left.value, right.value);
  if (!merged.valid) {
    throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
  }
  result.value = merged.data;
  return result;
}
const $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
  $ZodType.init(inst, def);
  const values = getEnumValues(def.entries);
  const valuesSet = new Set(values);
  inst._zod.values = valuesSet;
  inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (valuesSet.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values,
      input,
      inst
    });
    return payload;
  };
});
const $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
  $ZodType.init(inst, def);
  if (def.values.length === 0) {
    throw new Error("Cannot create literal schema with no valid values");
  }
  const values = new Set(def.values);
  inst._zod.values = values;
  inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (values.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values: def.values,
      input,
      inst
    });
    return payload;
  };
});
const $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    const _out = def.transform(payload.value, payload);
    if (ctx.async) {
      const output = _out instanceof Promise ? _out : Promise.resolve(_out);
      return output.then((output2) => {
        payload.value = output2;
        payload.fallback = true;
        return payload;
      });
    }
    if (_out instanceof Promise) {
      throw new $ZodAsyncError();
    }
    payload.value = _out;
    payload.fallback = true;
    return payload;
  };
});
function handleOptionalResult(result, input) {
  if (input === void 0 && (result.issues.length || result.fallback)) {
    return { issues: [], value: void 0 };
  }
  return result;
}
const $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  inst._zod.optout = "optional";
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
  });
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    if (def.innerType._zod.optin === "optional") {
      const input = payload.value;
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise)
        return result.then((r) => handleOptionalResult(r, input));
      return handleOptionalResult(result, input);
    }
    if (payload.value === void 0) {
      return payload;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
const $ZodExactOptional = /* @__PURE__ */ $constructor("$ZodExactOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
  inst._zod.parse = (payload, ctx) => {
    return def.innerType._zod.run(payload, ctx);
  };
});
const $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
  });
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, null]) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    if (payload.value === null)
      return payload;
    return def.innerType._zod.run(payload, ctx);
  };
});
const $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
      return payload;
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleDefaultResult(result2, def));
    }
    return handleDefaultResult(result, def);
  };
});
function handleDefaultResult(payload, def) {
  if (payload.value === void 0) {
    payload.value = def.defaultValue;
  }
  return payload;
}
const $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
const $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => {
    const v = def.innerType._zod.values;
    return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleNonOptionalResult(result2, inst));
    }
    return handleNonOptionalResult(result, inst);
  };
});
function handleNonOptionalResult(payload, inst) {
  if (!payload.issues.length && payload.value === void 0) {
    payload.issues.push({
      code: "invalid_type",
      expected: "nonoptional",
      input: payload.value,
      inst
    });
  }
  return payload;
}
const $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => {
        payload.value = result2.value;
        if (result2.issues.length) {
          payload.value = def.catchValue({
            ...payload,
            error: {
              issues: result2.issues.map((iss) => finalizeIssue(iss, ctx, config()))
            },
            input: payload.value
          });
          payload.issues = [];
          payload.fallback = true;
        }
        return payload;
      });
    }
    payload.value = result.value;
    if (result.issues.length) {
      payload.value = def.catchValue({
        ...payload,
        error: {
          issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
        },
        input: payload.value
      });
      payload.issues = [];
      payload.fallback = true;
    }
    return payload;
  };
});
const $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => def.in._zod.values);
  defineLazy(inst._zod, "optin", () => def.in._zod.optin);
  defineLazy(inst._zod, "optout", () => def.out._zod.optout);
  defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      const right = def.out._zod.run(payload, ctx);
      if (right instanceof Promise) {
        return right.then((right2) => handlePipeResult(right2, def.in, ctx));
      }
      return handlePipeResult(right, def.in, ctx);
    }
    const left = def.in._zod.run(payload, ctx);
    if (left instanceof Promise) {
      return left.then((left2) => handlePipeResult(left2, def.out, ctx));
    }
    return handlePipeResult(left, def.out, ctx);
  };
});
function handlePipeResult(left, next, ctx) {
  if (left.issues.length) {
    left.aborted = true;
    return left;
  }
  return next._zod.run({ value: left.value, issues: left.issues, fallback: left.fallback }, ctx);
}
const $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  defineLazy(inst._zod, "optin", () => def.innerType?._zod?.optin);
  defineLazy(inst._zod, "optout", () => def.innerType?._zod?.optout);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then(handleReadonlyResult);
    }
    return handleReadonlyResult(result);
  };
});
function handleReadonlyResult(payload) {
  payload.value = Object.freeze(payload.value);
  return payload;
}
const $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
  $ZodCheck.init(inst, def);
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _) => {
    return payload;
  };
  inst._zod.check = (payload) => {
    const input = payload.value;
    const r = def.fn(input);
    if (r instanceof Promise) {
      return r.then((r2) => handleRefineResult(r2, payload, input, inst));
    }
    handleRefineResult(r, payload, input, inst);
    return;
  };
});
function handleRefineResult(result, payload, input, inst) {
  if (!result) {
    const _iss = {
      code: "custom",
      input,
      inst,
      // incorporates params.error into issue reporting
      path: [...inst._zod.def.path ?? []],
      // incorporates params.error into issue reporting
      continue: !inst._zod.def.abort
      // params: inst._zod.def.params,
    };
    if (inst._zod.def.params)
      _iss.params = inst._zod.def.params;
    payload.issues.push(issue(_iss));
  }
}
var _a;
class $ZodRegistry {
  constructor() {
    this._map = /* @__PURE__ */ new WeakMap();
    this._idmap = /* @__PURE__ */ new Map();
  }
  add(schema, ..._meta) {
    const meta = _meta[0];
    this._map.set(schema, meta);
    if (meta && typeof meta === "object" && "id" in meta) {
      this._idmap.set(meta.id, schema);
    }
    return this;
  }
  clear() {
    this._map = /* @__PURE__ */ new WeakMap();
    this._idmap = /* @__PURE__ */ new Map();
    return this;
  }
  remove(schema) {
    const meta = this._map.get(schema);
    if (meta && typeof meta === "object" && "id" in meta) {
      this._idmap.delete(meta.id);
    }
    this._map.delete(schema);
    return this;
  }
  get(schema) {
    const p = schema._zod.parent;
    if (p) {
      const pm = { ...this.get(p) ?? {} };
      delete pm.id;
      const f = { ...pm, ...this._map.get(schema) };
      return Object.keys(f).length ? f : void 0;
    }
    return this._map.get(schema);
  }
  has(schema) {
    return this._map.has(schema);
  }
}
function registry() {
  return new $ZodRegistry();
}
(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
const globalRegistry = globalThis.__zod_globalRegistry;
// @__NO_SIDE_EFFECTS__
function _string(Class, params) {
  return new Class({
    type: "string",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _email(Class, params) {
  return new Class({
    type: "string",
    format: "email",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _guid(Class, params) {
  return new Class({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuid(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv4(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v4",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv6(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v6",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv7(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v7",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _url(Class, params) {
  return new Class({
    type: "string",
    format: "url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _emoji(Class, params) {
  return new Class({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _nanoid(Class, params) {
  return new Class({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cuid(Class, params) {
  return new Class({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cuid2(Class, params) {
  return new Class({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ulid(Class, params) {
  return new Class({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _xid(Class, params) {
  return new Class({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ksuid(Class, params) {
  return new Class({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ipv4(Class, params) {
  return new Class({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ipv6(Class, params) {
  return new Class({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cidrv4(Class, params) {
  return new Class({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cidrv6(Class, params) {
  return new Class({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _base64(Class, params) {
  return new Class({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _base64url(Class, params) {
  return new Class({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _e164(Class, params) {
  return new Class({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _jwt(Class, params) {
  return new Class({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDateTime(Class, params) {
  return new Class({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: false,
    local: false,
    precision: null,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDate(Class, params) {
  return new Class({
    type: "string",
    format: "date",
    check: "string_format",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoTime(Class, params) {
  return new Class({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDuration(Class, params) {
  return new Class({
    type: "string",
    format: "duration",
    check: "string_format",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _number(Class, params) {
  return new Class({
    type: "number",
    checks: [],
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _coercedNumber(Class, params) {
  return new Class({
    type: "number",
    coerce: true,
    checks: [],
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _int(Class, params) {
  return new Class({
    type: "number",
    check: "number_format",
    abort: false,
    format: "safeint",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _unknown(Class) {
  return new Class({
    type: "unknown"
  });
}
// @__NO_SIDE_EFFECTS__
function _never(Class, params) {
  return new Class({
    type: "never",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _lt(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
// @__NO_SIDE_EFFECTS__
function _lte(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
// @__NO_SIDE_EFFECTS__
function _gt(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
// @__NO_SIDE_EFFECTS__
function _gte(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
// @__NO_SIDE_EFFECTS__
function _multipleOf(value, params) {
  return new $ZodCheckMultipleOf({
    check: "multiple_of",
    ...normalizeParams(params),
    value
  });
}
// @__NO_SIDE_EFFECTS__
function _maxLength(maximum, params) {
  const ch = new $ZodCheckMaxLength({
    check: "max_length",
    ...normalizeParams(params),
    maximum
  });
  return ch;
}
// @__NO_SIDE_EFFECTS__
function _minLength(minimum, params) {
  return new $ZodCheckMinLength({
    check: "min_length",
    ...normalizeParams(params),
    minimum
  });
}
// @__NO_SIDE_EFFECTS__
function _length(length, params) {
  return new $ZodCheckLengthEquals({
    check: "length_equals",
    ...normalizeParams(params),
    length
  });
}
// @__NO_SIDE_EFFECTS__
function _regex(pattern, params) {
  return new $ZodCheckRegex({
    check: "string_format",
    format: "regex",
    ...normalizeParams(params),
    pattern
  });
}
// @__NO_SIDE_EFFECTS__
function _lowercase(params) {
  return new $ZodCheckLowerCase({
    check: "string_format",
    format: "lowercase",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uppercase(params) {
  return new $ZodCheckUpperCase({
    check: "string_format",
    format: "uppercase",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _includes(includes, params) {
  return new $ZodCheckIncludes({
    check: "string_format",
    format: "includes",
    ...normalizeParams(params),
    includes
  });
}
// @__NO_SIDE_EFFECTS__
function _startsWith(prefix, params) {
  return new $ZodCheckStartsWith({
    check: "string_format",
    format: "starts_with",
    ...normalizeParams(params),
    prefix
  });
}
// @__NO_SIDE_EFFECTS__
function _endsWith(suffix, params) {
  return new $ZodCheckEndsWith({
    check: "string_format",
    format: "ends_with",
    ...normalizeParams(params),
    suffix
  });
}
// @__NO_SIDE_EFFECTS__
function _overwrite(tx) {
  return new $ZodCheckOverwrite({
    check: "overwrite",
    tx
  });
}
// @__NO_SIDE_EFFECTS__
function _normalize(form) {
  return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
}
// @__NO_SIDE_EFFECTS__
function _trim() {
  return /* @__PURE__ */ _overwrite((input) => input.trim());
}
// @__NO_SIDE_EFFECTS__
function _toLowerCase() {
  return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
}
// @__NO_SIDE_EFFECTS__
function _toUpperCase() {
  return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
}
// @__NO_SIDE_EFFECTS__
function _slugify() {
  return /* @__PURE__ */ _overwrite((input) => slugify(input));
}
// @__NO_SIDE_EFFECTS__
function _array(Class, element, params) {
  return new Class({
    type: "array",
    element,
    // get element() {
    //   return element;
    // },
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _refine(Class, fn, _params) {
  const schema = new Class({
    type: "custom",
    check: "custom",
    fn,
    ...normalizeParams(_params)
  });
  return schema;
}
// @__NO_SIDE_EFFECTS__
function _superRefine(fn, params) {
  const ch = /* @__PURE__ */ _check((payload) => {
    payload.addIssue = (issue$1) => {
      if (typeof issue$1 === "string") {
        payload.issues.push(issue(issue$1, payload.value, ch._zod.def));
      } else {
        const _issue = issue$1;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = ch);
        _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
        payload.issues.push(issue(_issue));
      }
    };
    return fn(payload.value, payload);
  }, params);
  return ch;
}
// @__NO_SIDE_EFFECTS__
function _check(fn, params) {
  const ch = new $ZodCheck({
    check: "custom",
    ...normalizeParams(params)
  });
  ch._zod.check = fn;
  return ch;
}
function initializeContext(params) {
  let target = params?.target ?? "draft-2020-12";
  if (target === "draft-4")
    target = "draft-04";
  if (target === "draft-7")
    target = "draft-07";
  return {
    processors: params.processors ?? {},
    metadataRegistry: params?.metadata ?? globalRegistry,
    target,
    unrepresentable: params?.unrepresentable ?? "throw",
    override: params?.override ?? (() => {
    }),
    io: params?.io ?? "output",
    counter: 0,
    seen: /* @__PURE__ */ new Map(),
    cycles: params?.cycles ?? "ref",
    reused: params?.reused ?? "inline",
    external: params?.external ?? void 0
  };
}
function process$1(schema, ctx, _params = { path: [], schemaPath: [] }) {
  var _a2;
  const def = schema._zod.def;
  const seen = ctx.seen.get(schema);
  if (seen) {
    seen.count++;
    const isCycle = _params.schemaPath.includes(schema);
    if (isCycle) {
      seen.cycle = _params.path;
    }
    return seen.schema;
  }
  const result = { schema: {}, count: 1, cycle: void 0, path: _params.path };
  ctx.seen.set(schema, result);
  const overrideSchema = schema._zod.toJSONSchema?.();
  if (overrideSchema) {
    result.schema = overrideSchema;
  } else {
    const params = {
      ..._params,
      schemaPath: [..._params.schemaPath, schema],
      path: _params.path
    };
    if (schema._zod.processJSONSchema) {
      schema._zod.processJSONSchema(ctx, result.schema, params);
    } else {
      const _json = result.schema;
      const processor = ctx.processors[def.type];
      if (!processor) {
        throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
      }
      processor(schema, ctx, _json, params);
    }
    const parent = schema._zod.parent;
    if (parent) {
      if (!result.ref)
        result.ref = parent;
      process$1(parent, ctx, params);
      ctx.seen.get(parent).isParent = true;
    }
  }
  const meta = ctx.metadataRegistry.get(schema);
  if (meta)
    Object.assign(result.schema, meta);
  if (ctx.io === "input" && isTransforming(schema)) {
    delete result.schema.examples;
    delete result.schema.default;
  }
  if (ctx.io === "input" && "_prefault" in result.schema)
    (_a2 = result.schema).default ?? (_a2.default = result.schema._prefault);
  delete result.schema._prefault;
  const _result = ctx.seen.get(schema);
  return _result.schema;
}
function extractDefs(ctx, schema) {
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const idToSchema = /* @__PURE__ */ new Map();
  for (const entry of ctx.seen.entries()) {
    const id = ctx.metadataRegistry.get(entry[0])?.id;
    if (id) {
      const existing = idToSchema.get(id);
      if (existing && existing !== entry[0]) {
        throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
      }
      idToSchema.set(id, entry[0]);
    }
  }
  const makeURI = (entry) => {
    const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
    if (ctx.external) {
      const externalId = ctx.external.registry.get(entry[0])?.id;
      const uriGenerator = ctx.external.uri ?? ((id2) => id2);
      if (externalId) {
        return { ref: uriGenerator(externalId) };
      }
      const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
      entry[1].defId = id;
      return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}` };
    }
    if (entry[1] === root) {
      return { ref: "#" };
    }
    const uriPrefix = `#`;
    const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
    const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
    return { defId, ref: defUriPrefix + defId };
  };
  const extractToDef = (entry) => {
    if (entry[1].schema.$ref) {
      return;
    }
    const seen = entry[1];
    const { ref, defId } = makeURI(entry);
    seen.def = { ...seen.schema };
    if (defId)
      seen.defId = defId;
    const schema2 = seen.schema;
    for (const key in schema2) {
      delete schema2[key];
    }
    schema2.$ref = ref;
  };
  if (ctx.cycles === "throw") {
    for (const entry of ctx.seen.entries()) {
      const seen = entry[1];
      if (seen.cycle) {
        throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
      }
    }
  }
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (schema === entry[0]) {
      extractToDef(entry);
      continue;
    }
    if (ctx.external) {
      const ext = ctx.external.registry.get(entry[0])?.id;
      if (schema !== entry[0] && ext) {
        extractToDef(entry);
        continue;
      }
    }
    const id = ctx.metadataRegistry.get(entry[0])?.id;
    if (id) {
      extractToDef(entry);
      continue;
    }
    if (seen.cycle) {
      extractToDef(entry);
      continue;
    }
    if (seen.count > 1) {
      if (ctx.reused === "ref") {
        extractToDef(entry);
        continue;
      }
    }
  }
}
function finalize(ctx, schema) {
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const flattenRef = (zodSchema) => {
    const seen = ctx.seen.get(zodSchema);
    if (seen.ref === null)
      return;
    const schema2 = seen.def ?? seen.schema;
    const _cached = { ...schema2 };
    const ref = seen.ref;
    seen.ref = null;
    if (ref) {
      flattenRef(ref);
      const refSeen = ctx.seen.get(ref);
      const refSchema = refSeen.schema;
      if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
        schema2.allOf = schema2.allOf ?? [];
        schema2.allOf.push(refSchema);
      } else {
        Object.assign(schema2, refSchema);
      }
      Object.assign(schema2, _cached);
      const isParentRef = zodSchema._zod.parent === ref;
      if (isParentRef) {
        for (const key in schema2) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (!(key in _cached)) {
            delete schema2[key];
          }
        }
      }
      if (refSchema.$ref && refSeen.def) {
        for (const key in schema2) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (key in refSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(refSeen.def[key])) {
            delete schema2[key];
          }
        }
      }
    }
    const parent = zodSchema._zod.parent;
    if (parent && parent !== ref) {
      flattenRef(parent);
      const parentSeen = ctx.seen.get(parent);
      if (parentSeen?.schema.$ref) {
        schema2.$ref = parentSeen.schema.$ref;
        if (parentSeen.def) {
          for (const key in schema2) {
            if (key === "$ref" || key === "allOf")
              continue;
            if (key in parentSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(parentSeen.def[key])) {
              delete schema2[key];
            }
          }
        }
      }
    }
    ctx.override({
      zodSchema,
      jsonSchema: schema2,
      path: seen.path ?? []
    });
  };
  for (const entry of [...ctx.seen.entries()].reverse()) {
    flattenRef(entry[0]);
  }
  const result = {};
  if (ctx.target === "draft-2020-12") {
    result.$schema = "https://json-schema.org/draft/2020-12/schema";
  } else if (ctx.target === "draft-07") {
    result.$schema = "http://json-schema.org/draft-07/schema#";
  } else if (ctx.target === "draft-04") {
    result.$schema = "http://json-schema.org/draft-04/schema#";
  } else if (ctx.target === "openapi-3.0") ;
  else ;
  if (ctx.external?.uri) {
    const id = ctx.external.registry.get(schema)?.id;
    if (!id)
      throw new Error("Schema is missing an `id` property");
    result.$id = ctx.external.uri(id);
  }
  Object.assign(result, root.def ?? root.schema);
  const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
  if (rootMetaId !== void 0 && result.id === rootMetaId)
    delete result.id;
  const defs = ctx.external?.defs ?? {};
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (seen.def && seen.defId) {
      if (seen.def.id === seen.defId)
        delete seen.def.id;
      defs[seen.defId] = seen.def;
    }
  }
  if (ctx.external) ;
  else {
    if (Object.keys(defs).length > 0) {
      if (ctx.target === "draft-2020-12") {
        result.$defs = defs;
      } else {
        result.definitions = defs;
      }
    }
  }
  try {
    const finalized = JSON.parse(JSON.stringify(result));
    Object.defineProperty(finalized, "~standard", {
      value: {
        ...schema["~standard"],
        jsonSchema: {
          input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
          output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
        }
      },
      enumerable: false,
      writable: false
    });
    return finalized;
  } catch (_err) {
    throw new Error("Error converting schema to JSON.");
  }
}
function isTransforming(_schema, _ctx) {
  const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
  if (ctx.seen.has(_schema))
    return false;
  ctx.seen.add(_schema);
  const def = _schema._zod.def;
  if (def.type === "transform")
    return true;
  if (def.type === "array")
    return isTransforming(def.element, ctx);
  if (def.type === "set")
    return isTransforming(def.valueType, ctx);
  if (def.type === "lazy")
    return isTransforming(def.getter(), ctx);
  if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") {
    return isTransforming(def.innerType, ctx);
  }
  if (def.type === "intersection") {
    return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
  }
  if (def.type === "record" || def.type === "map") {
    return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
  }
  if (def.type === "pipe") {
    if (_schema._zod.traits.has("$ZodCodec"))
      return true;
    return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
  }
  if (def.type === "object") {
    for (const key in def.shape) {
      if (isTransforming(def.shape[key], ctx))
        return true;
    }
    return false;
  }
  if (def.type === "union") {
    for (const option of def.options) {
      if (isTransforming(option, ctx))
        return true;
    }
    return false;
  }
  if (def.type === "tuple") {
    for (const item of def.items) {
      if (isTransforming(item, ctx))
        return true;
    }
    if (def.rest && isTransforming(def.rest, ctx))
      return true;
    return false;
  }
  return false;
}
const createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
  const ctx = initializeContext({ ...params, processors });
  process$1(schema, ctx);
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
};
const createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
  const { libraryOptions, target } = params ?? {};
  const ctx = initializeContext({ ...libraryOptions ?? {}, target, io, processors });
  process$1(schema, ctx);
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
};
const formatMap = {
  guid: "uuid",
  url: "uri",
  datetime: "date-time",
  json_string: "json-string",
  regex: ""
  // do not set
};
const stringProcessor = (schema, ctx, _json, _params) => {
  const json = _json;
  json.type = "string";
  const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
  if (typeof minimum === "number")
    json.minLength = minimum;
  if (typeof maximum === "number")
    json.maxLength = maximum;
  if (format) {
    json.format = formatMap[format] ?? format;
    if (json.format === "")
      delete json.format;
    if (format === "time") {
      delete json.format;
    }
  }
  if (contentEncoding)
    json.contentEncoding = contentEncoding;
  if (patterns && patterns.size > 0) {
    const regexes = [...patterns];
    if (regexes.length === 1)
      json.pattern = regexes[0].source;
    else if (regexes.length > 1) {
      json.allOf = [
        ...regexes.map((regex) => ({
          ...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
          pattern: regex.source
        }))
      ];
    }
  }
};
const numberProcessor = (schema, ctx, _json, _params) => {
  const json = _json;
  const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
  if (typeof format === "string" && format.includes("int"))
    json.type = "integer";
  else
    json.type = "number";
  const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
  const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
  const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
  if (exMin) {
    if (legacy) {
      json.minimum = exclusiveMinimum;
      json.exclusiveMinimum = true;
    } else {
      json.exclusiveMinimum = exclusiveMinimum;
    }
  } else if (typeof minimum === "number") {
    json.minimum = minimum;
  }
  if (exMax) {
    if (legacy) {
      json.maximum = exclusiveMaximum;
      json.exclusiveMaximum = true;
    } else {
      json.exclusiveMaximum = exclusiveMaximum;
    }
  } else if (typeof maximum === "number") {
    json.maximum = maximum;
  }
  if (typeof multipleOf === "number")
    json.multipleOf = multipleOf;
};
const neverProcessor = (_schema, _ctx, json, _params) => {
  json.not = {};
};
const unknownProcessor = (_schema, _ctx, _json, _params) => {
};
const enumProcessor = (schema, _ctx, json, _params) => {
  const def = schema._zod.def;
  const values = getEnumValues(def.entries);
  if (values.every((v) => typeof v === "number"))
    json.type = "number";
  if (values.every((v) => typeof v === "string"))
    json.type = "string";
  json.enum = values;
};
const literalProcessor = (schema, ctx, json, _params) => {
  const def = schema._zod.def;
  const vals = [];
  for (const val of def.values) {
    if (val === void 0) {
      if (ctx.unrepresentable === "throw") {
        throw new Error("Literal `undefined` cannot be represented in JSON Schema");
      }
    } else if (typeof val === "bigint") {
      if (ctx.unrepresentable === "throw") {
        throw new Error("BigInt literals cannot be represented in JSON Schema");
      } else {
        vals.push(Number(val));
      }
    } else {
      vals.push(val);
    }
  }
  if (vals.length === 0) ;
  else if (vals.length === 1) {
    const val = vals[0];
    json.type = val === null ? "null" : typeof val;
    if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
      json.enum = [val];
    } else {
      json.const = val;
    }
  } else {
    if (vals.every((v) => typeof v === "number"))
      json.type = "number";
    if (vals.every((v) => typeof v === "string"))
      json.type = "string";
    if (vals.every((v) => typeof v === "boolean"))
      json.type = "boolean";
    if (vals.every((v) => v === null))
      json.type = "null";
    json.enum = vals;
  }
};
const customProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Custom types cannot be represented in JSON Schema");
  }
};
const transformProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Transforms cannot be represented in JSON Schema");
  }
};
const arrayProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const def = schema._zod.def;
  const { minimum, maximum } = schema._zod.bag;
  if (typeof minimum === "number")
    json.minItems = minimum;
  if (typeof maximum === "number")
    json.maxItems = maximum;
  json.type = "array";
  json.items = process$1(def.element, ctx, {
    ...params,
    path: [...params.path, "items"]
  });
};
const objectProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const def = schema._zod.def;
  json.type = "object";
  json.properties = {};
  const shape = def.shape;
  for (const key in shape) {
    json.properties[key] = process$1(shape[key], ctx, {
      ...params,
      path: [...params.path, "properties", key]
    });
  }
  const allKeys = new Set(Object.keys(shape));
  const requiredKeys = new Set([...allKeys].filter((key) => {
    const v = def.shape[key]._zod;
    if (ctx.io === "input") {
      return v.optin === void 0;
    } else {
      return v.optout === void 0;
    }
  }));
  if (requiredKeys.size > 0) {
    json.required = Array.from(requiredKeys);
  }
  if (def.catchall?._zod.def.type === "never") {
    json.additionalProperties = false;
  } else if (!def.catchall) {
    if (ctx.io === "output")
      json.additionalProperties = false;
  } else if (def.catchall) {
    json.additionalProperties = process$1(def.catchall, ctx, {
      ...params,
      path: [...params.path, "additionalProperties"]
    });
  }
};
const unionProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  const isExclusive = def.inclusive === false;
  const options = def.options.map((x, i) => process$1(x, ctx, {
    ...params,
    path: [...params.path, isExclusive ? "oneOf" : "anyOf", i]
  }));
  if (isExclusive) {
    json.oneOf = options;
  } else {
    json.anyOf = options;
  }
};
const intersectionProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  const a = process$1(def.left, ctx, {
    ...params,
    path: [...params.path, "allOf", 0]
  });
  const b = process$1(def.right, ctx, {
    ...params,
    path: [...params.path, "allOf", 1]
  });
  const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
  const allOf = [
    ...isSimpleIntersection(a) ? a.allOf : [a],
    ...isSimpleIntersection(b) ? b.allOf : [b]
  ];
  json.allOf = allOf;
};
const nullableProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  const inner = process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  if (ctx.target === "openapi-3.0") {
    seen.ref = def.innerType;
    json.nullable = true;
  } else {
    json.anyOf = [inner, { type: "null" }];
  }
};
const nonoptionalProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
const defaultProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json.default = JSON.parse(JSON.stringify(def.defaultValue));
};
const prefaultProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  if (ctx.io === "input")
    json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
};
const catchProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  let catchValue;
  try {
    catchValue = def.catchValue(void 0);
  } catch {
    throw new Error("Dynamic catch values are not supported in JSON Schema");
  }
  json.default = catchValue;
};
const pipeProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  const inIsTransform = def.in._zod.traits.has("$ZodTransform");
  const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
  process$1(innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = innerType;
};
const readonlyProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json.readOnly = true;
};
const optionalProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
const ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
  $ZodISODateTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function datetime(params) {
  return /* @__PURE__ */ _isoDateTime(ZodISODateTime, params);
}
const ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
  $ZodISODate.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function date(params) {
  return /* @__PURE__ */ _isoDate(ZodISODate, params);
}
const ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
  $ZodISOTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function time(params) {
  return /* @__PURE__ */ _isoTime(ZodISOTime, params);
}
const ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
  $ZodISODuration.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function duration(params) {
  return /* @__PURE__ */ _isoDuration(ZodISODuration, params);
}
const initializer = (inst, issues) => {
  $ZodError.init(inst, issues);
  inst.name = "ZodError";
  Object.defineProperties(inst, {
    format: {
      value: (mapper) => formatError(inst, mapper)
      // enumerable: false,
    },
    flatten: {
      value: (mapper) => flattenError(inst, mapper)
      // enumerable: false,
    },
    addIssue: {
      value: (issue2) => {
        inst.issues.push(issue2);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
      // enumerable: false,
    },
    addIssues: {
      value: (issues2) => {
        inst.issues.push(...issues2);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
      // enumerable: false,
    },
    isEmpty: {
      get() {
        return inst.issues.length === 0;
      }
      // enumerable: false,
    }
  });
};
const ZodRealError = /* @__PURE__ */ $constructor("ZodError", initializer, {
  Parent: Error
});
const parse = /* @__PURE__ */ _parse(ZodRealError);
const parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
const safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
const safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
const encode = /* @__PURE__ */ _encode(ZodRealError);
const decode = /* @__PURE__ */ _decode(ZodRealError);
const encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
const decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
const safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
const safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
const safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
const safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
const _installedGroups = /* @__PURE__ */ new WeakMap();
function _installLazyMethods(inst, group, methods) {
  const proto = Object.getPrototypeOf(inst);
  let installed = _installedGroups.get(proto);
  if (!installed) {
    installed = /* @__PURE__ */ new Set();
    _installedGroups.set(proto, installed);
  }
  if (installed.has(group))
    return;
  installed.add(group);
  for (const key in methods) {
    const fn = methods[key];
    Object.defineProperty(proto, key, {
      configurable: true,
      enumerable: false,
      get() {
        const bound = fn.bind(this);
        Object.defineProperty(this, key, {
          configurable: true,
          writable: true,
          enumerable: true,
          value: bound
        });
        return bound;
      },
      set(v) {
        Object.defineProperty(this, key, {
          configurable: true,
          writable: true,
          enumerable: true,
          value: v
        });
      }
    });
  }
}
const ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
  $ZodType.init(inst, def);
  Object.assign(inst["~standard"], {
    jsonSchema: {
      input: createStandardJSONSchemaMethod(inst, "input"),
      output: createStandardJSONSchemaMethod(inst, "output")
    }
  });
  inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
  inst.def = def;
  inst.type = def.type;
  Object.defineProperty(inst, "_def", { value: def });
  inst.parse = (data, params) => parse(inst, data, params, { callee: inst.parse });
  inst.safeParse = (data, params) => safeParse(inst, data, params);
  inst.parseAsync = async (data, params) => parseAsync(inst, data, params, { callee: inst.parseAsync });
  inst.safeParseAsync = async (data, params) => safeParseAsync(inst, data, params);
  inst.spa = inst.safeParseAsync;
  inst.encode = (data, params) => encode(inst, data, params);
  inst.decode = (data, params) => decode(inst, data, params);
  inst.encodeAsync = async (data, params) => encodeAsync(inst, data, params);
  inst.decodeAsync = async (data, params) => decodeAsync(inst, data, params);
  inst.safeEncode = (data, params) => safeEncode(inst, data, params);
  inst.safeDecode = (data, params) => safeDecode(inst, data, params);
  inst.safeEncodeAsync = async (data, params) => safeEncodeAsync(inst, data, params);
  inst.safeDecodeAsync = async (data, params) => safeDecodeAsync(inst, data, params);
  _installLazyMethods(inst, "ZodType", {
    check(...chks) {
      const def2 = this.def;
      return this.clone(mergeDefs(def2, {
        checks: [
          ...def2.checks ?? [],
          ...chks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
        ]
      }), { parent: true });
    },
    with(...chks) {
      return this.check(...chks);
    },
    clone(def2, params) {
      return clone(this, def2, params);
    },
    brand() {
      return this;
    },
    register(reg, meta) {
      reg.add(this, meta);
      return this;
    },
    refine(check, params) {
      return this.check(refine(check, params));
    },
    superRefine(refinement, params) {
      return this.check(superRefine(refinement, params));
    },
    overwrite(fn) {
      return this.check(/* @__PURE__ */ _overwrite(fn));
    },
    optional() {
      return optional(this);
    },
    exactOptional() {
      return exactOptional(this);
    },
    nullable() {
      return nullable(this);
    },
    nullish() {
      return optional(nullable(this));
    },
    nonoptional(params) {
      return nonoptional(this, params);
    },
    array() {
      return array(this);
    },
    or(arg) {
      return union([this, arg]);
    },
    and(arg) {
      return intersection(this, arg);
    },
    transform(tx) {
      return pipe(this, transform(tx));
    },
    default(d) {
      return _default(this, d);
    },
    prefault(d) {
      return prefault(this, d);
    },
    catch(params) {
      return _catch(this, params);
    },
    pipe(target) {
      return pipe(this, target);
    },
    readonly() {
      return readonly(this);
    },
    describe(description) {
      const cl = this.clone();
      globalRegistry.add(cl, { description });
      return cl;
    },
    meta(...args) {
      if (args.length === 0)
        return globalRegistry.get(this);
      const cl = this.clone();
      globalRegistry.add(cl, args[0]);
      return cl;
    },
    isOptional() {
      return this.safeParse(void 0).success;
    },
    isNullable() {
      return this.safeParse(null).success;
    },
    apply(fn) {
      return fn(this);
    }
  });
  Object.defineProperty(inst, "description", {
    get() {
      return globalRegistry.get(inst)?.description;
    },
    configurable: true
  });
  return inst;
});
const _ZodString = /* @__PURE__ */ $constructor("_ZodString", (inst, def) => {
  $ZodString.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json);
  const bag = inst._zod.bag;
  inst.format = bag.format ?? null;
  inst.minLength = bag.minimum ?? null;
  inst.maxLength = bag.maximum ?? null;
  _installLazyMethods(inst, "_ZodString", {
    regex(...args) {
      return this.check(/* @__PURE__ */ _regex(...args));
    },
    includes(...args) {
      return this.check(/* @__PURE__ */ _includes(...args));
    },
    startsWith(...args) {
      return this.check(/* @__PURE__ */ _startsWith(...args));
    },
    endsWith(...args) {
      return this.check(/* @__PURE__ */ _endsWith(...args));
    },
    min(...args) {
      return this.check(/* @__PURE__ */ _minLength(...args));
    },
    max(...args) {
      return this.check(/* @__PURE__ */ _maxLength(...args));
    },
    length(...args) {
      return this.check(/* @__PURE__ */ _length(...args));
    },
    nonempty(...args) {
      return this.check(/* @__PURE__ */ _minLength(1, ...args));
    },
    lowercase(params) {
      return this.check(/* @__PURE__ */ _lowercase(params));
    },
    uppercase(params) {
      return this.check(/* @__PURE__ */ _uppercase(params));
    },
    trim() {
      return this.check(/* @__PURE__ */ _trim());
    },
    normalize(...args) {
      return this.check(/* @__PURE__ */ _normalize(...args));
    },
    toLowerCase() {
      return this.check(/* @__PURE__ */ _toLowerCase());
    },
    toUpperCase() {
      return this.check(/* @__PURE__ */ _toUpperCase());
    },
    slugify() {
      return this.check(/* @__PURE__ */ _slugify());
    }
  });
});
const ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
  $ZodString.init(inst, def);
  _ZodString.init(inst, def);
  inst.email = (params) => inst.check(/* @__PURE__ */ _email(ZodEmail, params));
  inst.url = (params) => inst.check(/* @__PURE__ */ _url(ZodURL, params));
  inst.jwt = (params) => inst.check(/* @__PURE__ */ _jwt(ZodJWT, params));
  inst.emoji = (params) => inst.check(/* @__PURE__ */ _emoji(ZodEmoji, params));
  inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
  inst.uuid = (params) => inst.check(/* @__PURE__ */ _uuid(ZodUUID, params));
  inst.uuidv4 = (params) => inst.check(/* @__PURE__ */ _uuidv4(ZodUUID, params));
  inst.uuidv6 = (params) => inst.check(/* @__PURE__ */ _uuidv6(ZodUUID, params));
  inst.uuidv7 = (params) => inst.check(/* @__PURE__ */ _uuidv7(ZodUUID, params));
  inst.nanoid = (params) => inst.check(/* @__PURE__ */ _nanoid(ZodNanoID, params));
  inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
  inst.cuid = (params) => inst.check(/* @__PURE__ */ _cuid(ZodCUID, params));
  inst.cuid2 = (params) => inst.check(/* @__PURE__ */ _cuid2(ZodCUID2, params));
  inst.ulid = (params) => inst.check(/* @__PURE__ */ _ulid(ZodULID, params));
  inst.base64 = (params) => inst.check(/* @__PURE__ */ _base64(ZodBase64, params));
  inst.base64url = (params) => inst.check(/* @__PURE__ */ _base64url(ZodBase64URL, params));
  inst.xid = (params) => inst.check(/* @__PURE__ */ _xid(ZodXID, params));
  inst.ksuid = (params) => inst.check(/* @__PURE__ */ _ksuid(ZodKSUID, params));
  inst.ipv4 = (params) => inst.check(/* @__PURE__ */ _ipv4(ZodIPv4, params));
  inst.ipv6 = (params) => inst.check(/* @__PURE__ */ _ipv6(ZodIPv6, params));
  inst.cidrv4 = (params) => inst.check(/* @__PURE__ */ _cidrv4(ZodCIDRv4, params));
  inst.cidrv6 = (params) => inst.check(/* @__PURE__ */ _cidrv6(ZodCIDRv6, params));
  inst.e164 = (params) => inst.check(/* @__PURE__ */ _e164(ZodE164, params));
  inst.datetime = (params) => inst.check(datetime(params));
  inst.date = (params) => inst.check(date(params));
  inst.time = (params) => inst.check(time(params));
  inst.duration = (params) => inst.check(duration(params));
});
function string(params) {
  return /* @__PURE__ */ _string(ZodString, params);
}
const ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  _ZodString.init(inst, def);
});
const ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
  $ZodEmail.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
  $ZodGUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
  $ZodUUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
  $ZodURL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
  $ZodEmoji.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
  $ZodNanoID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
  $ZodCUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
  $ZodCUID2.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
  $ZodULID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
  $ZodXID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
  $ZodKSUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
  $ZodIPv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
  $ZodIPv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
  $ZodCIDRv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
  $ZodCIDRv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
  $ZodBase64.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
  $ZodBase64URL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
  $ZodE164.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
  $ZodJWT.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodNumber = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
  $ZodNumber.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json);
  _installLazyMethods(inst, "ZodNumber", {
    gt(value, params) {
      return this.check(/* @__PURE__ */ _gt(value, params));
    },
    gte(value, params) {
      return this.check(/* @__PURE__ */ _gte(value, params));
    },
    min(value, params) {
      return this.check(/* @__PURE__ */ _gte(value, params));
    },
    lt(value, params) {
      return this.check(/* @__PURE__ */ _lt(value, params));
    },
    lte(value, params) {
      return this.check(/* @__PURE__ */ _lte(value, params));
    },
    max(value, params) {
      return this.check(/* @__PURE__ */ _lte(value, params));
    },
    int(params) {
      return this.check(int(params));
    },
    safe(params) {
      return this.check(int(params));
    },
    positive(params) {
      return this.check(/* @__PURE__ */ _gt(0, params));
    },
    nonnegative(params) {
      return this.check(/* @__PURE__ */ _gte(0, params));
    },
    negative(params) {
      return this.check(/* @__PURE__ */ _lt(0, params));
    },
    nonpositive(params) {
      return this.check(/* @__PURE__ */ _lte(0, params));
    },
    multipleOf(value, params) {
      return this.check(/* @__PURE__ */ _multipleOf(value, params));
    },
    step(value, params) {
      return this.check(/* @__PURE__ */ _multipleOf(value, params));
    },
    finite() {
      return this;
    }
  });
  const bag = inst._zod.bag;
  inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
  inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
  inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? 0.5);
  inst.isFinite = true;
  inst.format = bag.format ?? null;
});
function number$1(params) {
  return /* @__PURE__ */ _number(ZodNumber, params);
}
const ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
  $ZodNumberFormat.init(inst, def);
  ZodNumber.init(inst, def);
});
function int(params) {
  return /* @__PURE__ */ _int(ZodNumberFormat, params);
}
const ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
  $ZodUnknown.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => unknownProcessor();
});
function unknown() {
  return /* @__PURE__ */ _unknown(ZodUnknown);
}
const ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
  $ZodNever.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json);
});
function never(params) {
  return /* @__PURE__ */ _never(ZodNever, params);
}
const ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
  $ZodArray.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
  inst.element = def.element;
  _installLazyMethods(inst, "ZodArray", {
    min(n, params) {
      return this.check(/* @__PURE__ */ _minLength(n, params));
    },
    nonempty(params) {
      return this.check(/* @__PURE__ */ _minLength(1, params));
    },
    max(n, params) {
      return this.check(/* @__PURE__ */ _maxLength(n, params));
    },
    length(n, params) {
      return this.check(/* @__PURE__ */ _length(n, params));
    },
    unwrap() {
      return this.element;
    }
  });
});
function array(element, params) {
  return /* @__PURE__ */ _array(ZodArray, element, params);
}
const ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
  $ZodObjectJIT.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
  defineLazy(inst, "shape", () => {
    return def.shape;
  });
  _installLazyMethods(inst, "ZodObject", {
    keyof() {
      return _enum(Object.keys(this._zod.def.shape));
    },
    catchall(catchall) {
      return this.clone({ ...this._zod.def, catchall });
    },
    passthrough() {
      return this.clone({ ...this._zod.def, catchall: unknown() });
    },
    loose() {
      return this.clone({ ...this._zod.def, catchall: unknown() });
    },
    strict() {
      return this.clone({ ...this._zod.def, catchall: never() });
    },
    strip() {
      return this.clone({ ...this._zod.def, catchall: void 0 });
    },
    extend(incoming) {
      return extend(this, incoming);
    },
    safeExtend(incoming) {
      return safeExtend(this, incoming);
    },
    merge(other) {
      return merge(this, other);
    },
    pick(mask) {
      return pick(this, mask);
    },
    omit(mask) {
      return omit(this, mask);
    },
    partial(...args) {
      return partial(ZodOptional, this, args[0]);
    },
    required(...args) {
      return required(ZodNonOptional, this, args[0]);
    }
  });
});
function object(shape, params) {
  const def = {
    type: "object",
    shape: shape ?? {},
    ...normalizeParams(params)
  };
  return new ZodObject(def);
}
const ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
  $ZodUnion.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
  inst.options = def.options;
});
function union(options, params) {
  return new ZodUnion({
    type: "union",
    options,
    ...normalizeParams(params)
  });
}
const ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
  $ZodIntersection.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
});
function intersection(left, right) {
  return new ZodIntersection({
    type: "intersection",
    left,
    right
  });
}
const ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
  $ZodEnum.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json);
  inst.enum = def.entries;
  inst.options = Object.values(def.entries);
  const keys = new Set(Object.keys(def.entries));
  inst.extract = (values, params) => {
    const newEntries = {};
    for (const value of values) {
      if (keys.has(value)) {
        newEntries[value] = def.entries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...normalizeParams(params),
      entries: newEntries
    });
  };
  inst.exclude = (values, params) => {
    const newEntries = { ...def.entries };
    for (const value of values) {
      if (keys.has(value)) {
        delete newEntries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...normalizeParams(params),
      entries: newEntries
    });
  };
});
function _enum(values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new ZodEnum({
    type: "enum",
    entries,
    ...normalizeParams(params)
  });
}
const ZodLiteral = /* @__PURE__ */ $constructor("ZodLiteral", (inst, def) => {
  $ZodLiteral.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => literalProcessor(inst, ctx, json);
  inst.values = new Set(def.values);
  Object.defineProperty(inst, "value", {
    get() {
      if (def.values.length > 1) {
        throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
      }
      return def.values[0];
    }
  });
});
function literal(value, params) {
  return new ZodLiteral({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...normalizeParams(params)
  });
}
const ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
  $ZodTransform.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx);
  inst._zod.parse = (payload, _ctx) => {
    if (_ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    payload.addIssue = (issue$1) => {
      if (typeof issue$1 === "string") {
        payload.issues.push(issue(issue$1, payload.value, def));
      } else {
        const _issue = issue$1;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = inst);
        payload.issues.push(issue(_issue));
      }
    };
    const output = def.transform(payload.value, payload);
    if (output instanceof Promise) {
      return output.then((output2) => {
        payload.value = output2;
        payload.fallback = true;
        return payload;
      });
    }
    payload.value = output;
    payload.fallback = true;
    return payload;
  };
});
function transform(fn) {
  return new ZodTransform({
    type: "transform",
    transform: fn
  });
}
const ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function optional(innerType) {
  return new ZodOptional({
    type: "optional",
    innerType
  });
}
const ZodExactOptional = /* @__PURE__ */ $constructor("ZodExactOptional", (inst, def) => {
  $ZodExactOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function exactOptional(innerType) {
  return new ZodExactOptional({
    type: "optional",
    innerType
  });
}
const ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
  $ZodNullable.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nullable(innerType) {
  return new ZodNullable({
    type: "nullable",
    innerType
  });
}
const ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
  $ZodDefault.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeDefault = inst.unwrap;
});
function _default(innerType, defaultValue) {
  return new ZodDefault({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
    }
  });
}
const ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
  $ZodPrefault.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function prefault(innerType, defaultValue) {
  return new ZodPrefault({
    type: "prefault",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
    }
  });
}
const ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
  $ZodNonOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nonoptional(innerType, params) {
  return new ZodNonOptional({
    type: "nonoptional",
    innerType,
    ...normalizeParams(params)
  });
}
const ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
  $ZodCatch.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeCatch = inst.unwrap;
});
function _catch(innerType, catchValue) {
  return new ZodCatch({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
  });
}
const ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
  $ZodPipe.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
  inst.in = def.in;
  inst.out = def.out;
});
function pipe(in_, out) {
  return new ZodPipe({
    type: "pipe",
    in: in_,
    out
    // ...util.normalizeParams(params),
  });
}
const ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
  $ZodReadonly.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function readonly(innerType) {
  return new ZodReadonly({
    type: "readonly",
    innerType
  });
}
const ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
  $ZodCustom.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx);
});
function refine(fn, _params = {}) {
  return /* @__PURE__ */ _refine(ZodCustom, fn, _params);
}
function superRefine(fn, params) {
  return /* @__PURE__ */ _superRefine(fn, params);
}
function number(params) {
  return /* @__PURE__ */ _coercedNumber(ZodNumber, params);
}
const positiveInt = number$1().int().positive();
const channelIdParam = object({
  id: number().int().positive()
});
const tierTreeParam = object({
  parentTier: string().min(1)
});
const channelCreateSchema = object({
  name: string().min(1).max(200),
  description: string().max(1e3).optional(),
  channelTier: string().optional(),
  parentChannel: positiveInt.optional(),
  status: _enum(["active", "disabled"]).optional()
});
const channelUpdateSchema = object({
  name: string().min(1).max(200).optional(),
  description: string().max(1e3).optional(),
  status: _enum(["active", "disabled"]).optional(),
  channelTier: string().optional(),
  parentChannel: positiveInt.optional()
});
const channelRootCreateSchema = object({
  name: string().min(1).max(200),
  description: string().max(1e3).optional()
});
const registerSchema = object({
  code: string().min(1),
  name: string().min(1).max(200).optional(),
  description: string().max(1e3).optional(),
  email: string().email().optional(),
  username: string().min(1).max(100).optional(),
  password: string().min(6).max(128).optional(),
  channelTier: string().optional()
});
const validateCodeSchema = object({
  code: string().min(1)
});
const memberInviteSchema = object({
  channelId: positiveInt,
  inviterId: positiveInt,
  email: string().email(),
  role: _enum(["member", "admin", "owner"]).optional()
});
const memberCreateSchema = object({
  channel: positiveInt,
  user: positiveInt,
  role: _enum(["member", "admin", "owner"]).optional()
});
const memberUpdateSchema = object({
  role: _enum(["member", "admin", "owner"])
});
const permissionCheckSchema = object({
  userId: positiveInt,
  channelId: positiveInt
});
const batchGrantSchema = union([
  object({
    type: literal("user"),
    targetId: positiveInt,
    channelIds: array(positiveInt).min(1),
    grantedBy: positiveInt.optional()
  }),
  object({
    type: literal("role"),
    targetId: string().min(1),
    channelIds: array(positiveInt).min(1),
    grantedBy: positiveInt.optional()
  })
]);
const useInviteSchema = object({
  code: string().min(1)
});
const userIdQuerySchema = object({
  userId: number().int().positive()
});
function validateOrThrow(schema, data, ctx) {
  const result = schema.safeParse(data);
  if (!result.success) {
    ctx.status = 400;
    ctx.body = { error: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ") };
    return null;
  }
  return result.data;
}
const wrap$4 = (data, meta = {}) => ({ data, meta });
const wrapList$3 = (result) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "data" in result && "pagination" in result) {
    return { data: result.data, meta: { pagination: result.pagination } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};
const channel$1 = ({ strapi }) => ({
  // 渠道范围过滤工具
  _scopeSvc() {
    return strapi.plugin("zhao-auth")?.service("channel-scope");
  },
  _channelFilter(ctx, field) {
    return this._scopeSvc()?.buildChannelFilter?.(ctx.state?.channelScope, field) ?? null;
  },
  _assertInScope(ctx, record, field) {
    this._scopeSvc()?.assertRecordInScope?.(ctx.state?.channelScope, record, field);
  },
  async find(ctx) {
    try {
      const service = strapi.plugin("zhao-channel").service("channel");
      ctx.body = wrapList$3(await service.find(ctx.query));
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async findOne(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.findOne(parsed.id);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "Channel not found" };
        return;
      }
      ctx.body = wrap$4(result);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async create(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const parsed = validateOrThrow(channelCreateSchema, body, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      ctx.body = wrap$4(await service.create(parsed));
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async update(ctx) {
    try {
      const paramParsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!paramParsed) return;
      const body = ctx.request.body?.data || ctx.request.body;
      const bodyParsed = validateOrThrow(channelUpdateSchema, body, ctx);
      if (!bodyParsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.update(paramParsed.id, bodyParsed);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "Channel not found" };
        return;
      }
      ctx.body = wrap$4(result);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async delete(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      ctx.body = wrap$4(await service.delete(parsed.id));
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async register(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const parsed = validateOrThrow(registerSchema, body, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.register(parsed);
      ctx.body = wrap$4(result);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async validate(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const parsed = validateOrThrow(validateCodeSchema, body, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.validateCode(parsed.code);
      ctx.body = wrap$4(result);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async validatePublic(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const parsed = validateOrThrow(validateCodeSchema, body, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.validateCode(parsed.code);
      ctx.body = wrap$4(result);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async registerPublic(ctx) {
    try {
      const parsed = validateOrThrow(registerSchema, ctx.request.body, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.register(parsed);
      let token = null;
      if (result.user) {
        const jwtService = strapi.plugin("zhao-auth").service("jwt");
        token = await jwtService.sign({
          id: result.user.id,
          email: result.user.email,
          username: result.user.username
        });
      }
      ctx.body = { ...result, token };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async getNetwork(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.getNetwork(parsed.id);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "Channel not found" };
        return;
      }
      ctx.body = wrap$4(result);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async getStats(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.getStats(parsed.id);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "Channel not found" };
        return;
      }
      ctx.body = wrap$4(result);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async getPublic(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.getPublic(parsed.id);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "Channel not found" };
        return;
      }
      ctx.body = wrap$4(result);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async adminFind(ctx) {
    try {
      const service = strapi.plugin("zhao-channel").service("channel");
      const query = { ...ctx.query };
      const cf = this._channelFilter(ctx, "id");
      if (cf) Object.assign(query, cf);
      ctx.body = wrapList$3(await service.find(query));
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async adminFindOne(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.findOne(parsed.id);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "Channel not found" };
        return;
      }
      this._assertInScope(ctx, { id: result.id }, "id");
      ctx.body = wrap$4(result);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async adminCreate(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const service = strapi.plugin("zhao-channel").service("channel");
      if (body.parentChannel) {
        const parentDocId = typeof body.parentChannel === "string" ? body.parentChannel : body.parentChannel?.documentId;
        if (parentDocId) {
          const parent = await strapi.db.query("plugin::zhao-channel.channel").findOne({
            where: { documentId: parentDocId },
            select: ["id"]
          });
          if (parent) {
            this._assertInScope(ctx, parent, "id");
          }
        }
        const parsed = validateOrThrow(channelCreateSchema, body, ctx);
        if (!parsed) return;
        ctx.body = wrap$4(await service.create(parsed));
      } else {
        const parsed = validateOrThrow(channelRootCreateSchema, body, ctx);
        if (!parsed) return;
        ctx.body = wrap$4(await service.createRoot(parsed));
      }
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async adminCreateRoot(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const parsed = validateOrThrow(channelRootCreateSchema, body, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      ctx.body = wrap$4(await service.createRoot(parsed));
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async adminGetChildren(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      this._assertInScope(ctx, { id: parsed.id }, "id");
      const service = strapi.plugin("zhao-channel").service("channel");
      const network = await service.getNetwork(parsed.id);
      ctx.body = wrapList$3(network?.children || []);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async adminGetHierarchy(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      this._assertInScope(ctx, { id: parsed.id }, "id");
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.getHierarchy(parsed.id);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "Channel not found" };
        return;
      }
      ctx.body = wrap$4(result);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async adminUpdate(ctx) {
    try {
      const paramParsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!paramParsed) return;
      this._assertInScope(ctx, { id: paramParsed.id }, "id");
      const body = ctx.request.body?.data || ctx.request.body;
      const bodyParsed = validateOrThrow(channelUpdateSchema, body, ctx);
      if (!bodyParsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.update(paramParsed.id, bodyParsed);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "Channel not found" };
        return;
      }
      ctx.body = wrap$4(result);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async updateConfig(ctx) {
    try {
      const paramParsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!paramParsed) return;
      this._assertInScope(ctx, { id: paramParsed.id }, "id");
      let data = ctx.request.body?.data || ctx.request.body;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          ctx.status = 400;
          ctx.body = { error: "无效的 JSON 数据" };
          return;
        }
      }
      const cleaned = { extraConfig: data.extraConfig || {} };
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.update(paramParsed.id, cleaned);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "Channel not found" };
        return;
      }
      ctx.body = wrap$4(result);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async adminDelete(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      this._assertInScope(ctx, { id: parsed.id }, "id");
      const service = strapi.plugin("zhao-channel").service("channel");
      ctx.body = wrap$4(await service.delete(parsed.id));
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async adminGetTierTree(ctx) {
    try {
      const parsed = validateOrThrow(tierTreeParam, ctx.params, ctx);
      if (!parsed) return;
      ctx.body = wrap$4(getTierTree(parsed.parentTier));
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  }
});
const wrap$3 = (data, meta = {}) => ({ data, meta });
const wrapList$2 = (result) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "data" in result && "pagination" in result) {
    return { data: result.data, meta: { pagination: result.pagination } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};
const channelMember$1 = ({ strapi }) => ({
  // 渠道范围过滤工具
  _scopeSvc() {
    return strapi.plugin("zhao-auth")?.service("channel-scope");
  },
  _channelFilter(ctx, field) {
    return this._scopeSvc()?.buildChannelFilter?.(ctx.state?.channelScope, field) ?? null;
  },
  _assertInScope(ctx, record, field) {
    this._scopeSvc()?.assertRecordInScope?.(ctx.state?.channelScope, record, field);
  },
  async find(ctx) {
    try {
      const service = strapi.plugin("zhao-channel").service("channel-member");
      const query = { ...ctx.query };
      const cf = this._channelFilter(ctx, "channel");
      if (cf) {
        query.channel = query.channel ? { $and: [{ documentId: query.channel }, cf.channel] } : cf.channel;
      }
      const result = await service.find(query);
      ctx.body = wrapList$2(result);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async findOne(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel-member");
      const result = await service.findOne(parsed.id);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "Member not found" };
        return;
      }
      this._assertInScope(ctx, result, "channel");
      ctx.body = wrap$3(result);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async create(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const channelDocId = body.channelId ?? body.channel?.documentId ?? body.channel;
      if (channelDocId) {
        const channel2 = await strapi.db.query("plugin::zhao-channel.channel").findOne({
          where: { documentId: typeof channelDocId === "string" ? channelDocId : String(channelDocId) },
          select: ["id"]
        });
        if (channel2) {
          this._assertInScope(ctx, channel2, "id");
        }
      }
      if (body.channelId !== void 0 || body.inviterId !== void 0) {
        const parsed2 = validateOrThrow(memberInviteSchema, body, ctx);
        if (!parsed2) return;
        const service2 = strapi.plugin("zhao-channel").service("channel-member");
        const result2 = await service2.inviteMember(parsed2.channelId, parsed2.inviterId, {
          email: parsed2.email,
          role: parsed2.role
        });
        ctx.body = wrap$3(result2);
        return;
      }
      const parsed = validateOrThrow(memberCreateSchema, body, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel-member");
      const result = await service.createMember(parsed);
      ctx.body = wrap$3(result);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async update(ctx) {
    try {
      const paramParsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!paramParsed) return;
      const service = strapi.plugin("zhao-channel").service("channel-member");
      const existing = await service.findOne(paramParsed.id);
      if (!existing) {
        ctx.status = 404;
        ctx.body = { error: "Member not found" };
        return;
      }
      this._assertInScope(ctx, existing, "channel");
      const body = ctx.request.body?.data || ctx.request.body;
      const bodyParsed = validateOrThrow(memberUpdateSchema, body, ctx);
      if (!bodyParsed) return;
      const result = await service.updateMember(paramParsed.id, bodyParsed);
      ctx.body = wrap$3(result);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async delete(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel-member");
      const existing = await service.findOne(parsed.id);
      if (!existing) {
        ctx.status = 404;
        ctx.body = { error: "Member not found" };
        return;
      }
      this._assertInScope(ctx, existing, "channel");
      const result = await service.deleteMember(parsed.id);
      ctx.body = wrap$3(result);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  }
});
const wrap$2 = (data, meta = {}) => ({ data, meta });
const wrapList$1 = (result) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "data" in result && "pagination" in result) {
    return { data: result.data, meta: { pagination: result.pagination } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};
const channelPermission$1 = ({ strapi }) => ({
  async checkPermission(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const parsed = validateOrThrow(permissionCheckSchema, body, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel-permission");
      const hasPermission = await service.checkUserChannelPermission(parsed.userId, parsed.channelId);
      ctx.body = wrap$2({ hasPermission });
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async getUserChannels(ctx) {
    try {
      const userId = ctx.state.user?.id || ctx.params.userId;
      const service = strapi.plugin("zhao-channel").service("channel-permission");
      const channels = await service.getUserChannels(userId);
      ctx.body = wrapList$1(channels);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async batchGrant(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const parsed = validateOrThrow(batchGrantSchema, body, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel-permission");
      if (parsed.type === "role") {
        ctx.body = wrap$2(await service.grantChannelsToRole(parsed.targetId, parsed.channelIds, parsed.grantedBy));
      } else {
        ctx.body = wrap$2(await service.grantChannelsToUser(parsed.targetId, parsed.channelIds, parsed.grantedBy));
      }
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  }
});
const wrap$1 = (data, meta = {}) => ({ data, meta });
const wrapList = (result) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "data" in result && "pagination" in result) {
    return { data: result.data, meta: { pagination: result.pagination } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};
const userInvite$1 = ({ strapi }) => ({
  // 渠道范围过滤工具
  _scopeSvc() {
    return strapi.plugin("zhao-auth")?.service("channel-scope");
  },
  _channelFilter(ctx, field) {
    return this._scopeSvc()?.buildChannelFilter?.(ctx.state?.channelScope, field) ?? null;
  },
  _assertInScope(ctx, record, field) {
    this._scopeSvc()?.assertRecordInScope?.(ctx.state?.channelScope, record, field);
  },
  async find(ctx) {
    try {
      const service = strapi.plugin("zhao-channel").service("user-invite");
      const query = { ...ctx.query };
      const cf = this._channelFilter(ctx, "inviteChannel");
      if (cf) Object.assign(query, cf);
      const result = await service.find(query);
      ctx.body = wrapList(result);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async findOne(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("user-invite");
      const result = await service.findOne(parsed.id);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "Invite not found" };
        return;
      }
      this._assertInScope(ctx, result, "inviteChannel");
      ctx.body = wrap$1(result);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async create(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      if (body?.inviteChannel) {
        const channelDocId = typeof body.inviteChannel === "string" ? body.inviteChannel : body.inviteChannel?.documentId;
        if (channelDocId) {
          const channel2 = await strapi.db.query("plugin::zhao-channel.channel").findOne({
            where: { documentId: channelDocId },
            select: ["id"]
          });
          if (channel2) {
            this._assertInScope(ctx, channel2, "id");
          }
        }
      }
      const service = strapi.plugin("zhao-channel").service("user-invite");
      const result = await service.create(body);
      ctx.body = wrap$1(result);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async update(ctx) {
    try {
      const paramParsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!paramParsed) return;
      const service = strapi.plugin("zhao-channel").service("user-invite");
      const existing = await service.findOne(paramParsed.id);
      if (!existing) {
        ctx.status = 404;
        ctx.body = { error: "Invite not found" };
        return;
      }
      this._assertInScope(ctx, existing, "inviteChannel");
      const result = await service.update(paramParsed.id, ctx.request.body);
      ctx.body = wrap$1(result);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async delete(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("user-invite");
      const existing = await service.findOne(parsed.id);
      if (!existing) {
        ctx.status = 404;
        ctx.body = { error: "Invite not found" };
        return;
      }
      this._assertInScope(ctx, existing, "inviteChannel");
      const result = await service.delete(parsed.id);
      ctx.body = wrap$1(result);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async useInvite(ctx) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) {
        ctx.status = 401;
        ctx.body = { error: "未认证", code: "UNAUTHORIZED" };
        return;
      }
      const body = ctx.request.body?.data || ctx.request.body;
      const parsed = validateOrThrow(useInviteSchema, body, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("user-invite");
      const result = await service.useInvite(parsed.code, userId);
      ctx.body = wrap$1(result);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async getMyChain(ctx) {
    try {
      const userId = ctx.state.user?.id;
      if (userId) {
        const service = strapi.plugin("zhao-channel").service("user-invite");
        const result = await service.getDistributionChain(userId);
        ctx.body = wrap$1(result);
      } else {
        const parsed = validateOrThrow(userIdQuerySchema, ctx.query, ctx);
        if (!parsed) return;
        const service = strapi.plugin("zhao-channel").service("user-invite");
        const result = await service.getDistributionChain(parsed.userId);
        ctx.body = wrap$1(result);
      }
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async getMyDownstream(ctx) {
    try {
      const userId = ctx.state.user?.id;
      if (userId) {
        const service = strapi.plugin("zhao-channel").service("user-invite");
        const result = await service.getDirectDownstream(userId);
        ctx.body = wrapList(result);
      } else {
        const parsed = validateOrThrow(userIdQuerySchema, ctx.query, ctx);
        if (!parsed) return;
        const service = strapi.plugin("zhao-channel").service("user-invite");
        const result = await service.getDirectDownstream(parsed.userId);
        ctx.body = wrapList(result);
      }
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async getMyStats(ctx) {
    try {
      const userId = ctx.state.user?.id || (() => {
        const parsed = validateOrThrow(userIdQuerySchema, ctx.query, ctx);
        return parsed?.userId || null;
      })();
      if (!userId) {
        ctx.status = 400;
        ctx.body = { error: "用户ID无效" };
        return;
      }
      const service = strapi.plugin("zhao-channel").service("user-invite");
      let result = await service.getUserDistributionStats(userId);
      if (!result) {
        await service.createForUser(userId);
        result = await service.getUserDistributionStats(userId);
      }
      ctx.body = wrap$1(result || {
        userId,
        inviteCode: null,
        inviteMethod: "organic",
        distributionDepth: 0,
        distributionChain: [],
        boundChannel: null,
        stats: {
          directCount: 0,
          totalDownstreamCount: 0,
          maxDepth: 0
        }
      });
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  /**
   * SSO 远程同步分销关系（供 RemoteChannelSync 调用）
   * 请求体：{ userId, inviteCode?, channelCode? }
   */
  async syncInvite(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { userId, inviteCode, channelCode } = body || {};
      if (!userId || typeof userId !== "number") {
        ctx.status = 400;
        ctx.body = { error: "userId 必填且为数字" };
        return;
      }
      const service = strapi.plugin("zhao-channel").service("user-invite");
      const result = await service.createForUser(userId, void 0, void 0, inviteCode, channelCode);
      ctx.body = { success: true, data: result };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  }
});
const channelInvite = ({ strapi }) => ({
  async join(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) {
      ctx.status = 401;
      ctx.body = { error: "未认证", code: "UNAUTHORIZED" };
      return;
    }
    const body = ctx.request.body?.data || ctx.request.body;
    const { inviteCode } = body;
    if (!inviteCode) {
      ctx.status = 400;
      ctx.body = { error: "请提供渠道邀请码" };
      return;
    }
    try {
      const channelMemberService = strapi.plugin("zhao-channel").service("channel-member");
      const result = await channelMemberService.joinByInvite(userId, inviteCode);
      ctx.body = {
        success: true,
        message: "已成功加入渠道",
        data: {
          channelId: result.channelId,
          channelName: result.channelName,
          role: result.role,
          isNewMember: result.isNewMember
        }
      };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  }
});
const wrap = (data, meta = {}) => ({ data, meta });
const channelStats = ({ strapi }) => ({
  async getDashboard(ctx) {
    try {
      const channelScope = ctx.state?.channelScope || { all: false, channelIds: [] };
      const result = await strapi.plugin("zhao-channel").service("channel-stats").getDashboard(channelScope);
      ctx.body = wrap(result);
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  }
});
const controllers = {
  channel: channel$1,
  "channel-member": channelMember$1,
  "channel-permission": channelPermission$1,
  "user-invite": userInvite$1,
  "channel-invite": channelInvite,
  "channel-stats": channelStats
};
const middlewares = {};
const policies = {
  "sso-app-auth": ssoAppAuth
};
const publicRoute = (method, path2, handler) => ({
  method,
  path: `/v1${path2}`,
  handler,
  config: { auth: false }
});
const userRoute = (method, path2, handler) => ({
  method,
  path: `/v1${path2}`,
  handler,
  config: {
    auth: false,
    policies: ["plugin::zhao-auth.is-authenticated"]
  }
});
const memberRoute = (method, path2, handler) => ({
  method,
  path: `/v1${path2}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      "plugin::zhao-auth.has-channel-access"
    ]
  }
});
const channelScopeRoute = (method, path2, handler, permission) => ({
  method,
  path: `/v1/admin${path2}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
      "plugin::zhao-auth.has-channel-scope",
      "plugin::zhao-auth.has-tenant-access"
    ]
  }
});
const ssoSyncRoute = (method, path2, handler) => ({
  method,
  path: `/v1/admin${path2}`,
  handler,
  config: {
    auth: false,
    policies: ["plugin::zhao-channel.sso-app-auth"]
  }
});
const contentApi = () => ({
  type: "content-api",
  routes: [
    // ===== 公开路由 =====
    publicRoute("GET", "/channel/public/:id", "channel.getPublic"),
    publicRoute("POST", "/channel/validate/public", "channel.validatePublic"),
    publicRoute("POST", "/channel/register/public", "channel.registerPublic"),
    // ===== 用户路由（需认证） =====
    userRoute("GET", "/my/channels", "channel.find"),
    userRoute("POST", "/my/channel/register", "channel.register"),
    userRoute("POST", "/my/channel/validate", "channel.validate"),
    userRoute("GET", "/my/channels/accessible", "channel-permission.getUserChannels"),
    userRoute("GET", "/my/invite/chain", "user-invite.getMyChain"),
    userRoute("GET", "/my/invite/downstream", "user-invite.getMyDownstream"),
    userRoute("GET", "/my/invite/stats", "user-invite.getMyStats"),
    // ===== 成员路由（需渠道访问权） =====
    memberRoute("GET", "/channel/:id", "channel.findOne"),
    memberRoute("GET", "/channel/:id/network", "channel.getNetwork"),
    memberRoute("GET", "/channel/:id/stats", "channel.getStats"),
    memberRoute("GET", "/channel-members", "channel-member.find"),
    // ===== 渠道管理路由（需功能权限） =====
    channelScopeRoute("POST", "/channel", "channel.create", "channel.create"),
    channelScopeRoute("PUT", "/channel/:id", "channel.update", "channel.update"),
    channelScopeRoute("POST", "/channel-members", "channel-member.create", "channel-member.add"),
    channelScopeRoute("POST", "/permissions/batch-grant", "channel-permission.batchGrant", "channel-permission.set"),
    channelScopeRoute("DELETE", "/channel/:id", "channel.delete", "channel.delete"),
    // ===== 管理端 CRUD 路由（功能权限 + 渠道范围） =====
    channelScopeRoute("GET", "/channels", "channel.adminFind", "channel.read"),
    channelScopeRoute("GET", "/channels/tier-tree/:parentTier", "channel.adminGetTierTree", "channel.read"),
    channelScopeRoute("GET", "/channels/:id/children", "channel.adminGetChildren", "channel.read"),
    channelScopeRoute("GET", "/channels/:id/hierarchy", "channel.adminGetHierarchy", "channel.read"),
    channelScopeRoute("GET", "/channels/:id", "channel.adminFindOne", "channel.read"),
    channelScopeRoute("POST", "/channels", "channel.adminCreate", "channel.create"),
    channelScopeRoute("PUT", "/channels/:id", "channel.adminUpdate", "channel.update"),
    channelScopeRoute("PUT", "/channels/:id/config", "channel.updateConfig", "channel.config.update"),
    channelScopeRoute("DELETE", "/channels/:id", "channel.adminDelete", "channel.delete"),
    channelScopeRoute("GET", "/channel-members", "channel-member.find", "channel-member.read"),
    channelScopeRoute("GET", "/channel-members/:id", "channel-member.findOne", "channel-member.read"),
    channelScopeRoute("POST", "/channel-members", "channel-member.create", "channel-member.add"),
    channelScopeRoute("PUT", "/channel-members/:id", "channel-member.update", "channel-member.add"),
    channelScopeRoute("DELETE", "/channel-members/:id", "channel-member.delete", "channel-member.remove"),
    channelScopeRoute("POST", "/channel-permissions/check", "channel-permission.checkPermission", "channel-permission.set"),
    channelScopeRoute("GET", "/channel-permissions/user/:userId", "channel-permission.getUserChannels", "channel-member.read"),
    channelScopeRoute("GET", "/user-invites", "user-invite.find", "user-invite.send"),
    channelScopeRoute("GET", "/user-invites/:id", "user-invite.findOne", "user-invite.send"),
    channelScopeRoute("POST", "/user-invites", "user-invite.create", "user-invite.send"),
    channelScopeRoute("PUT", "/user-invites/:id", "user-invite.update", "user-invite.send"),
    channelScopeRoute("DELETE", "/user-invites/:id", "user-invite.delete", "channel.delete"),
    // C 端使用邀请码（仅需认证，无需渠道权限）
    userRoute("POST", "/user-invites/use", "user-invite.useInvite"),
    // C 端/Web后台通过渠道邀请码加入渠道（仅需认证）
    userRoute("POST", "/channel-invite/join", "channel-invite.join"),
    // ===== 仪表盘路由 =====
    channelScopeRoute("GET", "/dashboard", "channel-stats.getDashboard", "channel.read"),
    // ===== SSO 远程同步路由（签名认证） =====
    ssoSyncRoute("POST", "/user-invites/sync", "user-invite.syncInvite")
  ]
});
const routes = {
  "content-api": () => ({
    type: "content-api",
    routes: contentApi().routes
  })
};
function buildPath(parentPath, childId) {
  const normalizedParent = parentPath.endsWith("/") ? parentPath : `${parentPath}/`;
  return `${normalizedParent}${childId}/`;
}
function parsePathIds(path2) {
  if (!path2) {
    return [];
  }
  return path2.split("/").filter((p) => p && p !== "/").map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
}
function getPathPrefix(path2) {
  if (!path2) {
    return "/";
  }
  return path2.endsWith("/") ? path2 : `${path2}/`;
}
async function getDescendantIdsByPath(strapi, path2, includeSelf) {
  if (!path2) {
    return [];
  }
  const prefix = getPathPrefix(path2);
  const query = {
    path: { $startsWith: prefix }
  };
  if (!includeSelf) {
    const selfId = parsePathIds(path2).pop();
    if (selfId) {
      query.id = { $ne: selfId };
    }
  }
  const descendants = await strapi.db.query("plugin::zhao-channel.channel").findMany({
    where: query,
    select: ["id"]
  });
  return descendants.map((d) => d.id);
}
const path = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  buildPath,
  getDescendantIdsByPath,
  getPathPrefix,
  parsePathIds
}, Symbol.toStringTag, { value: "Module" }));
const XSS_PATTERN = /<\s*script|<\s*\/\s*script|javascript\s*:|on\w+\s*=/i;
function throwErr$1(code, status, message) {
  const e = new Error(message);
  e.code = code;
  e.status = status;
  throw e;
}
const CHANNEL_UID$2 = "plugin::zhao-channel.channel";
const CHANNEL_MEMBER_UID$3 = "plugin::zhao-channel.channel-member";
const USER_CHANNEL_UID$1 = "plugin::zhao-channel.user-channel";
const ROLE_CHANNEL_UID$1 = "plugin::zhao-auth.role-channel";
function generateCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}
function formatChannel$1(channel2) {
  if (!channel2) return null;
  return {
    id: channel2.id,
    documentId: channel2.documentId,
    attributes: {
      name: channel2.name,
      code: channel2.code,
      description: channel2.description,
      channelTier: channel2.channelTier,
      status: channel2.status,
      path: channel2.path,
      depth: channel2.depth,
      parentChannelId: channel2.parentChannel ? { id: channel2.parentChannel.id, name: channel2.parentChannel.name } : null,
      createdAt: channel2.createdAt,
      updatedAt: channel2.updatedAt
    }
  };
}
const channel = ({ strapi }) => ({
  /**
   * 查询渠道列表
   */
  async find(query = {}) {
    const { page = 1, pageSize = 20, site, filters: queryFilters, ...rest } = query;
    const filters = { ...queryFilters, ...rest };
    const siteValue = site || filters.site;
    if (siteValue) {
      delete filters.site;
      const siteConfig = await strapi.db.query("plugin::zhao-common.site-config").findOne({
        where: { documentId: siteValue },
        select: ["id"]
      });
      if (!siteConfig) {
        return {
          list: [],
          pagination: { page: Number(page), pageSize: Number(pageSize), total: 0, pageCount: 0 }
        };
      }
      const knex = strapi.db.connection;
      const linkRows = await knex("zhao_channels_sites_lnk").where("site_config_id", siteConfig.id).select("channel_id");
      const channelIds = linkRows.map((r) => r.channel_id);
      if (channelIds.length === 0) {
        return {
          list: [],
          pagination: { page: Number(page), pageSize: Number(pageSize), total: 0, pageCount: 0 }
        };
      }
      filters.id = { $in: channelIds };
    }
    const channels = await strapi.db.query(CHANNEL_UID$2).findMany({
      where: filters,
      offset: (page - 1) * pageSize,
      limit: pageSize,
      populate: ["parentChannel"]
    });
    const total = await strapi.db.query(CHANNEL_UID$2).count({ where: filters });
    return {
      list: channels.map(formatChannel$1),
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        pageCount: Math.ceil(total / pageSize)
      }
    };
  },
  /**
   * 查询单个渠道
   */
  async findOne(id) {
    if (typeof id !== "number" || !Number.isFinite(id)) {
      throwErr$1("030114", 400, "无效的渠道 ID");
    }
    const channel2 = await strapi.db.query(CHANNEL_UID$2).findOne({
      where: { id },
      populate: ["parentChannel"]
    });
    if (!channel2) return null;
    return formatChannel$1(channel2);
  },
  /**
   * 创建渠道（在已有父渠道下创建）
   */
  async create(data) {
    if (!data.name || !data.name.trim()) {
      throwErr$1("030111", 400, "渠道名称不能为空");
    }
    if (data.channelTier && !validateTier(data.channelTier)) {
      throwErr$1("030112", 400, `无效的渠道层级: ${data.channelTier}`);
    }
    if (XSS_PATTERN.test(data.name) || data.description && XSS_PATTERN.test(data.description)) {
      throwErr$1("030113", 400, "输入包含不允许的内容");
    }
    const code = data.code || generateCode();
    let path2 = "/";
    let depth = 0;
    let parent = null;
    if (data.parentChannel) {
      const parentId = typeof data.parentChannel === "object" ? data.parentChannel.id || data.parentChannel : data.parentChannel;
      parent = await strapi.db.query(CHANNEL_UID$2).findOne({
        where: { id: parentId }
      });
      if (parent) {
        if (isLeafTier(parent.channelTier)) {
          throwErr$1("030105", 400, "渠道层级深度超限（最大 " + MAX_CHANNEL_DEPTH + " 级）");
        }
        path2 = parent.path || "/";
        depth = (parent.depth || 0) + 1;
      }
    }
    const channel2 = await strapi.db.query(CHANNEL_UID$2).create({
      data: { ...data, code, path: path2, depth }
    });
    if (!data.parentChannel) {
      const updatedPath2 = `/${channel2.id}/`;
      const updated2 = await strapi.db.query(CHANNEL_UID$2).update({
        where: { id: channel2.id },
        data: { path: updatedPath2, depth: 0 }
      });
      return formatChannel$1(updated2);
    }
    const updatedPath = buildPath(parent?.path || "/", channel2.id);
    const updatedDepth = (parent?.depth || 0) + 1;
    const updated = await strapi.db.query(CHANNEL_UID$2).update({
      where: { id: channel2.id },
      data: { path: updatedPath, depth: updatedDepth }
    });
    const updatedWithParent = await strapi.db.query(CHANNEL_UID$2).findOne({
      where: { id: updated.id },
      populate: ["parentChannel"]
    });
    return formatChannel$1(updatedWithParent);
  },
  /**
   * 更新渠道
   * 如果 parentChannel 变更，需要递归更新所有子孙的 path
   */
  async update(id, data) {
    if (typeof id !== "number" || !Number.isFinite(id)) {
      throwErr$1("030114", 400, "无效的渠道 ID");
    }
    const original = await strapi.db.query(CHANNEL_UID$2).findOne({
      where: { id }
    });
    if (!original) {
      throwErr$1("000201", 404, "渠道不存在");
    }
    const hasParentChanged = data.parentChannel !== void 0 && data.parentChannel !== (original.parentChannel?.id || original.parentChannel);
    await strapi.db.query(CHANNEL_UID$2).update({
      where: { id },
      data
    });
    if (hasParentChanged && data.parentChannel !== null) {
      const newParentId = typeof data.parentChannel === "object" ? data.parentChannel.id || data.parentChannel : data.parentChannel;
      const newParent = await strapi.db.query(CHANNEL_UID$2).findOne({
        where: { id: newParentId }
      });
      const oldPath = original.path;
      const newPath = buildPath(newParent?.path || "/", id);
      const newDepth = (newParent?.depth || 0) + 1;
      if (newParent && isLeafTier(newParent.channelTier)) {
        throwErr$1("030105", 400, "渠道层级深度超限（最大 " + MAX_CHANNEL_DEPTH + " 级）");
      }
      await strapi.db.query(CHANNEL_UID$2).update({
        where: { id },
        data: { path: newPath, depth: newDepth }
      });
      if (oldPath && oldPath !== "/") {
        const descendants = await strapi.db.query(CHANNEL_UID$2).findMany({
          where: { path: { $startsWith: oldPath } },
          select: ["id", "path", "depth"]
        });
        for (const desc of descendants) {
          if (desc.id === id) continue;
          const relativePath = desc.path.substring(oldPath.length);
          const newDescPath = newPath + relativePath;
          const oldDepthOffset = desc.path ? desc.path.split("/").filter(Boolean).length - 1 : 0;
          const depthDiff = newDepth - (original.depth || 0);
          const newDescDepth = oldDepthOffset + depthDiff;
          await strapi.db.query(CHANNEL_UID$2).update({
            where: { id: desc.id },
            data: { path: newDescPath, depth: newDescDepth }
          });
        }
      }
      const updated = await strapi.db.query(CHANNEL_UID$2).findOne({
        where: { id },
        populate: ["parentChannel"]
      });
      return formatChannel$1(updated);
    }
    if (hasParentChanged && data.parentChannel === null) {
      const newPath = `/${id}/`;
      await strapi.db.query(CHANNEL_UID$2).update({
        where: { id },
        data: { path: newPath, depth: 0 }
      });
    }
    const final = await strapi.db.query(CHANNEL_UID$2).findOne({
      where: { id },
      populate: ["parentChannel"]
    });
    return formatChannel$1(final);
  },
  /**
   * 删除渠道（级联删除，使用事务保证一致性）
   * 1. 检查渠道是否存在
   * 2. 通过 path 查询所有子孙渠道
   * 3. 收集受影响的用户 ID
   * 4. 在单个事务内：删除关联 + 从叶子到根删除 channels
   * 5. 清理 Redis 缓存
   */
  async delete(id) {
    if (typeof id !== "number" || !Number.isFinite(id)) {
      throwErr$1("030114", 400, "无效的渠道 ID");
    }
    const channel2 = await strapi.db.query(CHANNEL_UID$2).findOne({
      where: { id }
    });
    if (!channel2) {
      throwErr$1("000201", 404, "渠道不存在");
    }
    const allDescendantIds = await getDescendantIdsByPath(strapi, channel2.path, false);
    const deleteIds = allDescendantIds.length > 0 ? allDescendantIds : [id];
    const affectedUserIds = /* @__PURE__ */ new Set();
    const members = await strapi.db.query(CHANNEL_MEMBER_UID$3).findMany({
      where: { channel: { $in: deleteIds } },
      populate: ["user"]
    });
    for (const m of members) {
      if (m.user) {
        const uid = typeof m.user === "object" ? m.user.id : m.user;
        if (uid) affectedUserIds.add(uid);
      }
    }
    const userChans = await strapi.db.query(USER_CHANNEL_UID$1).findMany({
      where: { channel: { $in: deleteIds } },
      populate: ["user"]
    });
    for (const uc of userChans) {
      if (uc.user) {
        const uid = typeof uc.user === "object" ? uc.user.id : uc.user;
        if (uid) affectedUserIds.add(uid);
      }
    }
    const result = await strapi.db.transaction(async (_trx) => {
      let deletedMembers = 0;
      if (deleteIds.length > 0) {
        const res = await strapi.db.query(CHANNEL_MEMBER_UID$3).deleteMany({
          where: { channel: { $in: deleteIds } }
        });
        deletedMembers = typeof res === "number" ? res : Number(res) || 0;
      }
      let deletedUserChannels = 0;
      if (deleteIds.length > 0) {
        const res = await strapi.db.query(USER_CHANNEL_UID$1).deleteMany({
          where: { channel: { $in: deleteIds } }
        });
        deletedUserChannels = typeof res === "number" ? res : Number(res) || 0;
      }
      let deletedRoleChannels = 0;
      if (deleteIds.length > 0) {
        const res = await strapi.db.query(ROLE_CHANNEL_UID$1).deleteMany({
          where: { channel: { $in: deleteIds } }
        });
        deletedRoleChannels = typeof res === "number" ? res : Number(res) || 0;
      }
      const channelsToDelete = await strapi.db.query(CHANNEL_UID$2).findMany({
        where: { id: { $in: deleteIds } },
        select: ["id", "depth", "name"]
      });
      channelsToDelete.sort((a, b) => (b.depth || 0) - (a.depth || 0));
      let deletedChannels = 0;
      for (const ch of channelsToDelete) {
        await strapi.db.query(CHANNEL_UID$2).delete({
          where: { id: ch.id }
        });
        deletedChannels++;
      }
      return { deletedChannels, deletedMembers, deletedUserChannels, deletedRoleChannels };
    });
    try {
      const { deleteUserAllChannelsCache: deleteUserAllChannelsCache2, clearAllChannelCache: clearAllChannelCache2 } = await Promise.resolve().then(() => redis);
      for (const uid of affectedUserIds) {
        await deleteUserAllChannelsCache2(uid);
      }
      await clearAllChannelCache2();
    } catch {
    }
    return {
      ...result,
      affectedUsers: affectedUserIds.size
    };
  },
  /**
   * 创建根渠道（root 级别）
   */
  async createRoot(data) {
    const code = generateCode();
    const channel2 = await strapi.db.query(CHANNEL_UID$2).create({
      data: {
        name: data.name,
        code,
        description: data.description,
        channelTier: ROOT_TIER,
        status: true,
        path: "/",
        depth: 0
      }
    });
    const updatedPath = `/${channel2.id}/`;
    const updated = await strapi.db.query(CHANNEL_UID$2).update({
      where: { id: channel2.id },
      data: { path: updatedPath }
    });
    return {
      id: updated.id,
      name: updated.name,
      code: updated.code,
      description: updated.description,
      channelTier: updated.channelTier,
      path: updated.path,
      depth: updated.depth
    };
  },
  /**
   * 通过邀请码注册子渠道，并创建登录用户
   */
  async register(data) {
    const parentChannel = await strapi.db.query(CHANNEL_UID$2).findOne({
      where: { code: data.code }
    });
    if (!parentChannel) {
      throwErr$1("030101", 404, "邀请码不存在或已过期");
    }
    if (!parentChannel.status) {
      throwErr$1("030104", 403, "渠道已被禁用");
    }
    if (isLeafTier(parentChannel.channelTier)) {
      throwErr$1("030105", 400, "渠道层级深度超限");
    }
    let childTier = data.channelTier;
    if (!childTier) {
      childTier = getOnlyChildTier(parentChannel.channelTier);
      if (!childTier) {
        throwErr$1("030109", 400, "root 渠道下注册必须指定 channelTier");
      }
    } else {
      const allowed = getChildTiers(parentChannel.channelTier);
      if (!allowed.includes(childTier)) {
        throwErr$1("030110", 403, `不允许在 "${parentChannel.channelTier}" 下注册 "${childTier}"`);
      }
    }
    const code = generateCode();
    const parentPath = parentChannel.path || "/";
    const childDepth = (parentChannel.depth || 0) + 1;
    const channel2 = await strapi.db.query(CHANNEL_UID$2).create({
      data: {
        name: data.name,
        code,
        description: data.description,
        channelTier: childTier,
        parentChannel: parentChannel.id,
        status: true,
        path: "/",
        // 占位，下一步更新
        depth: childDepth
      }
    });
    const updatedPath = buildPath(parentPath, channel2.id);
    const updated = await strapi.db.query(CHANNEL_UID$2).update({
      where: { id: channel2.id },
      data: { path: updatedPath }
    });
    let user = null;
    if (data.email && data.username && data.password) {
      const existingUserByEmail = await strapi.db.query("plugin::users-permissions.user").findOne({
        where: { email: data.email }
      });
      if (existingUserByEmail) {
        throwErr$1("030107", 409, "该邮箱已被注册");
      }
      const existingUserByUsername = await strapi.db.query("plugin::users-permissions.user").findOne({
        where: { username: data.username }
      });
      if (existingUserByUsername) {
        throwErr$1("030108", 409, "该用户名已被注册");
      }
      const ADMIN_CHANNEL_TIERS = ["core", "senior", "global", "authorized", "official", "partner"];
      const userRoles = ADMIN_CHANNEL_TIERS.includes(childTier) ? ["channel-admin", "user"] : ["user"];
      user = await strapi.entityService.create("plugin::users-permissions.user", {
        data: {
          email: data.email,
          username: data.username,
          password: data.password,
          provider: "local",
          confirmed: true,
          zhaoRoles: userRoles
        }
      });
      await strapi.db.query(CHANNEL_MEMBER_UID$3).create({
        data: {
          channel: updated.id,
          user: user.id,
          role: ADMIN_CHANNEL_TIERS.includes(childTier) ? "admin" : "member",
          isCurrent: true
        }
      });
      const parentOwner = await strapi.db.query(CHANNEL_MEMBER_UID$3).findOne({
        where: { channel: parentChannel.id, role: "admin" },
        populate: ["user"]
      });
      if (parentOwner?.user) {
        const parentUserId = typeof parentOwner.user === "object" ? parentOwner.user.id : parentOwner.user;
        const inviterInvite = await strapi.db.query("plugin::zhao-channel.user-invite").findOne({
          where: { user: parentUserId }
        });
        if (inviterInvite) {
          let distributionPath = `/${user.id}/`;
          let distributionDepth = 0;
          if ((inviterInvite.distributionDepth || 0) < 2) {
            const parentDistPath = inviterInvite.distributionPath || "/";
            distributionPath = buildPath(parentDistPath, user.id);
            distributionDepth = (inviterInvite.distributionDepth || 0) + 1;
          }
          const autoInvite = await strapi.db.query("plugin::zhao-channel.user-invite").findOne({
            where: { user: user.id }
          });
          if (autoInvite) {
            await strapi.db.query("plugin::zhao-channel.user-invite").update({
              where: { id: autoInvite.id },
              data: {
                invitedBy: parentUserId,
                inviteChannel: updated.id,
                inviteMethod: "invite_code",
                distributionPath,
                distributionDepth
              }
            });
          }
        }
      }
    }
    return {
      id: updated.id,
      name: updated.name,
      code: updated.code,
      description: updated.description,
      channelTier: updated.channelTier,
      path: updated.path,
      depth: updated.depth,
      parentChannelId: parentChannel.id,
      ...user ? {
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      } : {}
    };
  },
  /**
   * 获取渠道网络（父+直接子渠道）
   */
  async getNetwork(id) {
    const channel2 = await strapi.db.query(CHANNEL_UID$2).findOne({
      where: { id },
      populate: ["parentChannel"]
    });
    if (!channel2) return null;
    const children = await strapi.db.query(CHANNEL_UID$2).findMany({
      where: { parentChannel: id },
      populate: ["parentChannel"]
    });
    return {
      channel: formatChannel$1(channel2),
      children: children.map(formatChannel$1)
    };
  },
  /**
   * 验证邀请码
   */
  async validateCode(code) {
    const channel2 = await strapi.db.query(CHANNEL_UID$2).findOne({
      where: { code }
    });
    if (!channel2 || !channel2.status) {
      return { ok: true, valid: false };
    }
    return {
      ok: true,
      valid: true,
      channel: {
        id: channel2.id,
        name: channel2.name,
        code: channel2.code,
        channelTier: channel2.channelTier,
        path: channel2.path,
        depth: channel2.depth
      }
    };
  },
  /**
   * 获取完整层级树（使用 path 前缀一次性查询后再组装）
   */
  async getHierarchy(id) {
    const channel2 = await strapi.db.query(CHANNEL_UID$2).findOne({
      where: { id }
    });
    if (!channel2) return null;
    const prefix = getPathPrefix(channel2.path);
    const allDescendants = await strapi.db.query(CHANNEL_UID$2).findMany({
      where: {
        $and: [
          { path: { $startsWith: prefix } },
          { id: { $ne: id } }
        ]
      }
    });
    const nodeMap = /* @__PURE__ */ new Map();
    nodeMap.set(channel2.id, {
      id: channel2.id,
      name: channel2.name,
      code: channel2.code,
      channelTier: channel2.channelTier,
      path: channel2.path,
      depth: channel2.depth,
      children: []
    });
    for (const desc of allDescendants) {
      nodeMap.set(desc.id, {
        id: desc.id,
        name: desc.name,
        code: desc.code,
        channelTier: desc.channelTier,
        path: desc.path,
        depth: desc.depth,
        children: []
      });
    }
    const sorted = [...allDescendants].sort((a, b) => (a.depth || 0) - (b.depth || 0));
    for (const desc of sorted) {
      const parentId = desc.parentChannel?.id || parsePathIds(desc.path).slice(-2, -1)[0];
      if (parentId && nodeMap.has(parentId)) {
        const node = nodeMap.get(desc.id);
        if (node) {
          nodeMap.get(parentId).children.push(node);
        }
      }
    }
    return { hierarchy: nodeMap.get(channel2.id) };
  },
  /**
   * 获取渠道统计（使用 path 前缀计算子渠道数量）
   */
  async getStats(id) {
    const channel2 = await strapi.db.query(CHANNEL_UID$2).findOne({
      where: { id }
    });
    if (!channel2) return null;
    const descendantIds = await getDescendantIdsByPath(strapi, channel2.path, true);
    const subChannelCount = descendantIds.length;
    const memberCount = Number(await strapi.db.query(CHANNEL_MEMBER_UID$3).count({
      where: { channel: id }
    }));
    let totalSubMembers = 0;
    if (descendantIds.length > 0) {
      totalSubMembers = Number(await strapi.db.query(CHANNEL_MEMBER_UID$3).count({
        where: { channel: { $in: descendantIds } }
      }));
    }
    return {
      stats: {
        id: channel2.id,
        name: channel2.name,
        depth: channel2.depth,
        path: channel2.path,
        memberCount,
        subChannelCount,
        totalSubMembers,
        totalMembers: memberCount + totalSubMembers
      }
    };
  },
  /**
   * 获取渠道维度的分销统计（委派 user-invite service）
   */
  async getChannelDistributionStats(id) {
    const channel2 = await strapi.db.query(CHANNEL_UID$2).findOne({
      where: { id }
    });
    if (!channel2) return null;
    const stats = await strapi.plugin("zhao-channel").service("user-invite").getChannelDistributionStats(id);
    return {
      stats: {
        id: channel2.id,
        name: channel2.name,
        code: channel2.code,
        depth: channel2.depth,
        channelTier: channel2.channelTier,
        path: channel2.path,
        directCustomerCount: stats.directCustomerCount,
        subChannelCustomerCount: stats.subChannelCustomerCount,
        totalCustomerCount: stats.totalCustomerCount
      }
    };
  },
  /**
   * 获取公开渠道信息
   */
  async getPublic(id) {
    const channel2 = await strapi.db.query(CHANNEL_UID$2).findOne({
      where: { id }
    });
    if (!channel2) return null;
    return {
      id: channel2.id,
      name: channel2.name,
      description: channel2.description,
      channelTier: channel2.channelTier,
      path: channel2.path,
      depth: channel2.depth,
      createdAt: channel2.createdAt
    };
  },
  /**
   * 获取用户可访问的渠道 ID 列表（委托给 channel-permission 服务，包含缓存）
   */
  async getAccessibleChannelIds(userId) {
    return strapi.plugin("zhao-channel").service("channel-permission").getUserAllChannels(userId);
  }
});
function throwErr(code, status, message) {
  const e = new Error(message);
  e.code = code;
  e.status = status;
  throw e;
}
const CHANNEL_UID$1 = "plugin::zhao-channel.channel";
const CHANNEL_MEMBER_UID$2 = "plugin::zhao-channel.channel-member";
const USER_UID$2 = "plugin::users-permissions.user";
const USER_INVITE_UID$1 = "plugin::zhao-channel.user-invite";
function formatChannel(channel2) {
  if (!channel2) return null;
  return {
    id: channel2.id,
    name: channel2.name,
    code: channel2.code,
    description: channel2.description,
    channelTier: channel2.channelTier,
    status: channel2.status,
    path: channel2.path,
    depth: channel2.depth,
    parentChannelId: channel2.parentChannel ? { id: channel2.parentChannel.id, name: channel2.parentChannel.name } : null,
    createdAt: channel2.createdAt,
    updatedAt: channel2.updatedAt
  };
}
const channelMember = ({ strapi }) => ({
  async verifyInvitationCode(code) {
    const channel2 = await strapi.db.query(CHANNEL_UID$1).findOne({
      where: { code }
    });
    if (!channel2 || !channel2.status) {
      return { ok: true, valid: false };
    }
    return {
      ok: true,
      valid: true,
      channel: {
        id: channel2.id,
        name: channel2.name,
        code: channel2.code,
        channelTier: channel2.channelTier
      }
    };
  },
  async getMyChannel(userId) {
    const currentMember = await strapi.db.query(CHANNEL_MEMBER_UID$2).findOne({
      where: { user: userId, isCurrent: true },
      populate: ["channel"]
    });
    if (!currentMember?.channel) return null;
    const channelId = typeof currentMember.channel === "object" ? currentMember.channel.id : currentMember.channel;
    const channel2 = await strapi.db.query(CHANNEL_UID$1).findOne({
      where: { id: channelId },
      populate: ["parentChannel"]
    });
    if (!channel2) return null;
    return { channel: formatChannel(channel2) };
  },
  async updateMyChannel(userId, data) {
    const currentMember = await strapi.db.query(CHANNEL_MEMBER_UID$2).findOne({
      where: { user: userId, isCurrent: true },
      populate: ["channel"]
    });
    if (!currentMember?.channel) {
      throwErr("000201", 400, "用户未关联渠道");
    }
    const channelId = typeof currentMember.channel === "object" ? currentMember.channel.id : currentMember.channel;
    const channel2 = await strapi.db.query(CHANNEL_UID$1).update({
      where: { id: channelId },
      data
    });
    return { channel: formatChannel(channel2) };
  },
  async inviteMember(channelId, inviterId, data) {
    if (!data.email || data.email.trim() === "") {
      throwErr("000201", 400, "邮箱不能为空");
    }
    const channel2 = await strapi.db.query(CHANNEL_UID$1).findOne({
      where: { id: channelId }
    });
    if (!channel2) {
      throwErr("000201", 404, "渠道不存在");
    }
    let user = await strapi.db.query(USER_UID$2).findOne({
      where: { email: data.email }
    });
    const isNewUser = !user;
    const ADMIN_CHANNEL_TIERS = ["core", "senior", "global", "authorized", "official", "partner"];
    if (!user) {
      const userRole = ADMIN_CHANNEL_TIERS.includes(channel2.channelTier) && data.role === "admin" ? ["channel-admin", "user"] : ["user"];
      user = await strapi.entityService.create(USER_UID$2, {
        data: {
          email: data.email,
          username: data.email.split("@")[0],
          provider: "local",
          confirmed: false,
          zhaoRoles: userRole
        }
      });
      await strapi.db.query(CHANNEL_MEMBER_UID$2).create({
        data: {
          channel: channelId,
          user: user.id,
          role: data.role || "member",
          invitedBy: inviterId,
          isCurrent: true
        }
      });
      try {
        const userInviteService = strapi.plugin("zhao-channel").service("user-invite");
        const inviterInvite = await strapi.db.query(USER_INVITE_UID$1).findOne({
          where: { user: inviterId }
        });
        await userInviteService.createForUser(
          user.id,
          inviterInvite?.inviteCode || void 0,
          channelId
        );
      } catch (err) {
        strapi.log.error(
          `[zhao-channel] Failed to create user-invite for invited user ${user.id}: ${err.message}`
        );
      }
    } else {
      const existingMember = await strapi.db.query(CHANNEL_MEMBER_UID$2).findOne({
        where: { channel: channelId, user: user.id }
      });
      if (!existingMember) {
        await strapi.db.query(CHANNEL_MEMBER_UID$2).create({
          data: {
            channel: channelId,
            user: user.id,
            role: data.role || "member",
            invitedBy: inviterId
          }
        });
      }
    }
    return {
      invitation: {
        channel: {
          id: channel2.id,
          name: channel2.name
        },
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        },
        isNewUser
      }
    };
  },
  async getMembers(channelId) {
    const members = await strapi.db.query(CHANNEL_MEMBER_UID$2).findMany({
      where: { channel: channelId },
      populate: ["user"]
    });
    return {
      members: members.map((m) => ({
        id: m.user?.id,
        username: m.user?.username,
        email: m.user?.email,
        role: m.role,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt
      }))
    };
  },
  async removeMember(channelId, userId) {
    const channel2 = await strapi.db.query(CHANNEL_UID$1).findOne({
      where: { id: channelId }
    });
    if (!channel2) {
      throwErr("000201", 404, "渠道不存在");
    }
    const member = await strapi.db.query(CHANNEL_MEMBER_UID$2).findOne({
      where: { channel: channelId, user: userId }
    });
    if (!member) {
      throwErr("000201", 404, "成员不存在");
    }
    await strapi.db.query(CHANNEL_MEMBER_UID$2).delete({
      where: { channel: channelId, user: userId }
    });
    return null;
  },
  async updateMemberRole(channelId, userId, newRole) {
    const member = await strapi.db.query(CHANNEL_MEMBER_UID$2).findOne({
      where: { channel: channelId, user: userId }
    });
    if (!member) {
      throwErr("000201", 404, "成员不存在");
    }
    await strapi.db.query(CHANNEL_MEMBER_UID$2).update({
      where: { id: member.id },
      data: { role: newRole }
    });
    return null;
  },
  /**
   * 通过渠道邀请码加入渠道（C端/Web后台）
   */
  async joinByInvite(userId, inviteCode) {
    const channel2 = await strapi.db.query(CHANNEL_UID$1).findOne({
      where: { code: inviteCode }
    });
    if (!channel2) {
      throwErr("030101", 404, "邀请码不存在或已过期");
    }
    if (!channel2.status) {
      throwErr("030104", 403, "渠道已被禁用");
    }
    const existingMember = await strapi.db.query(CHANNEL_MEMBER_UID$2).findOne({
      where: { channel: channel2.id, user: userId }
    });
    if (existingMember) {
      return {
        channelId: channel2.id,
        channelName: channel2.name,
        role: existingMember.role,
        isNewMember: false
      };
    }
    const member = await strapi.db.query(CHANNEL_MEMBER_UID$2).create({
      data: {
        channel: channel2.id,
        user: userId,
        role: "member",
        isCurrent: false
      }
    });
    try {
      const userInviteService = strapi.plugin("zhao-channel").service("user-invite");
      await userInviteService.createForUser(userId, void 0, channel2.id);
    } catch (err) {
      strapi.log.error(
        `[zhao-channel] Failed to create user-invite for joined user ${userId}: ${err.message}`
      );
    }
    return {
      channelId: channel2.id,
      channelName: channel2.name,
      role: member.role,
      isNewMember: true
    };
  },
  /**
   * 简单 CRUD 方法（管理端用）
   */
  async find(query = {}) {
    const { channel: channel2, page, pageSize, populate, ...filters } = query;
    const params = { where: filters };
    if (populate) {
      params.populate = typeof populate === "string" ? populate : ["user", "channel"];
    } else {
      params.populate = ["user", "channel"];
    }
    if (channel2) {
      params.where = { ...params.where, channel: { documentId: { $eq: channel2 } } };
    }
    if (page || pageSize) {
      params.offset = ((parseInt(page, 10) || 1) - 1) * (parseInt(pageSize, 10) || 10);
      params.limit = parseInt(pageSize, 10) || 10;
    }
    return strapi.db.query(CHANNEL_MEMBER_UID$2).findMany(params);
  },
  async findOne(id) {
    return strapi.db.query(CHANNEL_MEMBER_UID$2).findOne({ where: { id }, populate: ["user", "channel"] });
  },
  async createMember(data) {
    return strapi.db.query(CHANNEL_MEMBER_UID$2).create({ data });
  },
  async updateMember(id, data) {
    return strapi.db.query(CHANNEL_MEMBER_UID$2).update({ where: { id }, data });
  },
  async deleteMember(id) {
    return strapi.db.query(CHANNEL_MEMBER_UID$2).delete({ where: { id } });
  },
  async setCurrentChannel(userId, channelId) {
    await strapi.db.query(CHANNEL_MEMBER_UID$2).updateMany({
      where: { user: userId },
      data: { isCurrent: false }
    });
    const existing = await strapi.db.query(CHANNEL_MEMBER_UID$2).findOne({
      where: { user: userId, channel: channelId }
    });
    if (existing) {
      return strapi.db.query(CHANNEL_MEMBER_UID$2).update({
        where: { id: existing.id },
        data: { isCurrent: true }
      });
    } else {
      return strapi.db.query(CHANNEL_MEMBER_UID$2).create({
        data: { user: userId, channel: channelId, isCurrent: true }
      });
    }
  }
});
const USER_CHANNEL_UID = "plugin::zhao-channel.user-channel";
const ROLE_CHANNEL_UID = "plugin::zhao-auth.role-channel";
const CHANNEL_MEMBER_UID$1 = "plugin::zhao-channel.channel-member";
const USER_UID$1 = "plugin::users-permissions.user";
const channelPermission = ({ strapi }) => ({
  async grantChannelsToUser(userId, channelIds, grantedBy) {
    const results = [];
    for (const channelId of channelIds) {
      const existing = await strapi.db.query(USER_CHANNEL_UID).findOne({
        where: { user: userId, channel: channelId }
      });
      if (!existing) {
        const result = await strapi.db.query(USER_CHANNEL_UID).create({
          data: { user: userId, channel: channelId, grantedBy }
        });
        results.push(result);
      }
    }
    const allUserChannels = await strapi.db.query(USER_CHANNEL_UID).findMany({
      where: { user: userId },
      populate: ["channel"]
    });
    const allChannelIds = allUserChannels.map(
      (uc) => uc.channel?.id || uc.channel
    );
    await setUserChannelCache(userId, allChannelIds);
    await deleteUserAllChannelsCache(userId);
    return { granted: results.length, channelIds };
  },
  async grantChannelsToRole(roleName, channelIds, grantedBy) {
    const results = [];
    for (const channelId of channelIds) {
      const existing = await strapi.db.query(ROLE_CHANNEL_UID).findOne({
        where: { role: roleName, channel: channelId }
      });
      if (!existing) {
        const result = await strapi.db.query(ROLE_CHANNEL_UID).create({
          data: { role: roleName, channel: channelId, grantedBy }
        });
        results.push(result);
      }
    }
    const allRoleChannels = await strapi.db.query(ROLE_CHANNEL_UID).findMany({
      where: { role: roleName },
      populate: ["channel"]
    });
    const allChannelIds = allRoleChannels.map(
      (rc) => rc.channel?.id || rc.channel
    );
    await setRoleChannelCache(roleName, allChannelIds);
    const usersWithRole = await strapi.db.query(USER_UID$1).findMany({
      select: ["id", "zhaoRoles"]
    });
    for (const user of usersWithRole) {
      const roles = user.zhaoRoles;
      if (Array.isArray(roles) && roles.includes(roleName)) {
        await deleteUserAllChannelsCache(user.id);
      }
    }
    return { granted: results.length, channelIds };
  },
  async batchGrantAsync(type, targetId, channelIds, grantedBy) {
    if (!channelIds || channelIds.length === 0) {
      return {
        jobId: `noop-${Date.now()}`,
        status: "completed",
        type,
        targetId,
        channelCount: 0
      };
    }
    try {
      const job = await Promise.race([
        addBatchGrantJob({
          type,
          targetId,
          channelIds,
          grantedBy
        }),
        new Promise(
          (_, reject) => setTimeout(() => reject(new Error("Queue timeout")), 5e3)
        )
      ]);
      return {
        jobId: job.id,
        status: "queued",
        type,
        targetId,
        channelCount: channelIds.length
      };
    } catch {
      return {
        jobId: `local-${Date.now()}`,
        status: "pending",
        type,
        targetId,
        channelCount: channelIds.length
      };
    }
  },
  async revokeChannelsFromUser(userId, channelIds) {
    let revoked = 0;
    for (const channelId of channelIds) {
      const deleted = await strapi.db.query(USER_CHANNEL_UID).delete({
        where: { user: userId, channel: channelId }
      });
      if (deleted) revoked++;
    }
    await deleteUserChannelCache(userId);
    await deleteUserAllChannelsCache(userId);
    return { revoked, channelIds };
  },
  async revokeChannelsFromRole(roleName, channelIds) {
    let revoked = 0;
    for (const channelId of channelIds) {
      const deleted = await strapi.db.query(ROLE_CHANNEL_UID).delete({
        where: { role: roleName, channel: channelId }
      });
      if (deleted) revoked++;
    }
    await deleteRoleChannelCache(roleName);
    const usersWithRole = await strapi.db.query(USER_UID$1).findMany({
      select: ["id", "zhaoRoles"]
    });
    for (const user of usersWithRole) {
      const roles = user.zhaoRoles;
      if (Array.isArray(roles) && roles.includes(roleName)) {
        await deleteUserAllChannelsCache(user.id);
      }
    }
    return { revoked, channelIds };
  },
  async getUserChannels(userId) {
    const userChannels = await strapi.db.query(USER_CHANNEL_UID).findMany({
      where: { user: userId },
      populate: ["channel"]
    });
    return userChannels.map((uc) => ({
      id: uc.channel?.id || uc.channel,
      name: uc.channel?.name
    }));
  },
  async getRoleChannels(roleName) {
    const roleChannels = await strapi.db.query(ROLE_CHANNEL_UID).findMany({
      where: { role: roleName },
      populate: ["channel"]
    });
    return roleChannels.map((rc) => ({
      id: rc.channel?.id || rc.channel,
      name: rc.channel?.name
    }));
  },
  async getBatchGrantStatus(jobId) {
    try {
      const { getBatchGrantQueue: getBatchGrantQueue2 } = await Promise.resolve().then(() => queue);
      const batchGrantQueue = getBatchGrantQueue2();
      if (!batchGrantQueue) {
        return { jobId, status: "unavailable" };
      }
      const job = await Promise.race([
        batchGrantQueue.getJob(jobId),
        new Promise((resolve) => setTimeout(() => resolve(null), 5e3))
      ]);
      if (!job) {
        return { jobId, status: "not_found" };
      }
      const state = await job.getState();
      return {
        jobId: job.id,
        status: state,
        type: job.data.type,
        targetId: job.data.targetId,
        channelCount: job.data.channelIds?.length || 0,
        finishedPercent: state === "completed" ? 100 : state === "failed" ? 0 : void 0
      };
    } catch {
      return { jobId, status: "unknown" };
    }
  },
  async getUserAllChannels(userId) {
    const { getUserAllChannelsCache: getUserAllChannelsCache2, setUserAllChannelsCache: setUserAllChannelsCache2 } = await Promise.resolve().then(() => redis);
    const cached2 = await getUserAllChannelsCache2(userId);
    if (cached2) return cached2;
    const channelIds = /* @__PURE__ */ new Set();
    const userChannels = await strapi.db.query(USER_CHANNEL_UID).findMany({
      where: { user: userId },
      populate: ["channel"]
    });
    for (const uc of userChannels) {
      if (uc.channel) {
        const cid = uc.channel.id || uc.channel;
        channelIds.add(cid);
        if (uc.channel.path) {
          const descendantIds = await getDescendantIdsByPath(strapi, uc.channel.path, false);
          descendantIds.forEach((id) => channelIds.add(id));
        }
      }
    }
    const user = await strapi.db.query(USER_UID$1).findOne({
      where: { id: userId },
      select: ["id", "zhaoRoles"],
      populate: ["role"]
    });
    if (user) {
      let roleNames = [];
      const zhaoRoles = user.zhaoRoles;
      if (Array.isArray(zhaoRoles) && zhaoRoles.length > 0) {
        roleNames = zhaoRoles.filter((r) => typeof r === "string");
      } else if (user.role?.type) {
        roleNames = [user.role.type];
      }
      if (roleNames.includes("admin")) {
        const allChannels = await strapi.db.query("plugin::zhao-channel.channel").findMany({
          select: ["id", "path"]
        });
        for (const ch of allChannels) {
          const cid = ch.id;
          if (cid) channelIds.add(cid);
          if (ch.path) {
            const descendantIds = await getDescendantIdsByPath(strapi, ch.path, false);
            descendantIds.forEach((id) => channelIds.add(id));
          }
        }
      } else {
        for (const roleName of roleNames) {
          const roleChannels = await strapi.db.query(ROLE_CHANNEL_UID).findMany({
            where: { role: roleName },
            populate: ["channel"]
          });
          for (const rc of roleChannels) {
            if (rc.channel) {
              const cid = rc.channel.id || rc.channel;
              channelIds.add(cid);
              if (rc.channel.path) {
                const descendantIds = await getDescendantIdsByPath(strapi, rc.channel.path, false);
                descendantIds.forEach((id) => channelIds.add(id));
              }
            }
          }
        }
      }
    }
    const currentMember = await strapi.db.query(CHANNEL_MEMBER_UID$1).findOne({
      where: { user: userId, isCurrent: true },
      populate: ["channel"]
    });
    if (currentMember?.channel) {
      const cid = currentMember.channel.id || currentMember.channel;
      channelIds.add(cid);
      if (currentMember.channel.path) {
        const descendantIds = await getDescendantIdsByPath(strapi, currentMember.channel.path, false);
        descendantIds.forEach((id) => channelIds.add(id));
      }
    }
    const result = Array.from(channelIds);
    await setUserAllChannelsCache2(userId, result);
    return result;
  },
  /**
   * 获取用户直接关联的渠道（不扩展子树）
   * 与 getUserAllChannels 的差异：不调用 getDescendantIdsByPath，仅返回三源直接关联的渠道 id
   * 适用场景：/channels/available 等仅需直接渠道的端点
   * 不走 Redis 缓存，直接查 DB
   */
  async getUserDirectChannels(userId) {
    const channelIds = /* @__PURE__ */ new Set();
    const userChannels = await strapi.db.query(USER_CHANNEL_UID).findMany({
      where: { user: userId },
      populate: ["channel"]
    });
    for (const uc of userChannels) {
      if (uc.channel) {
        const cid = uc.channel.id || uc.channel;
        channelIds.add(cid);
      }
    }
    const user = await strapi.db.query(USER_UID$1).findOne({
      where: { id: userId },
      select: ["id", "zhaoRoles"],
      populate: ["role"]
    });
    if (user) {
      let roleNames = [];
      const zhaoRoles = user.zhaoRoles;
      if (Array.isArray(zhaoRoles) && zhaoRoles.length > 0) {
        roleNames = zhaoRoles.filter((r) => typeof r === "string");
      } else if (user.role?.type) {
        roleNames = [user.role.type];
      }
      if (roleNames.includes("admin")) {
        const allChannels = await strapi.db.query("plugin::zhao-channel.channel").findMany({
          select: ["id"]
        });
        for (const ch of allChannels) {
          const cid = ch.id;
          if (cid) channelIds.add(cid);
        }
      } else {
        for (const roleName of roleNames) {
          const roleChannels = await strapi.db.query(ROLE_CHANNEL_UID).findMany({
            where: { role: roleName },
            populate: ["channel"]
          });
          for (const rc of roleChannels) {
            if (rc.channel) {
              const cid = rc.channel.id || rc.channel;
              channelIds.add(cid);
            }
          }
        }
      }
    }
    const currentMember = await strapi.db.query(CHANNEL_MEMBER_UID$1).findOne({
      where: { user: userId, isCurrent: true },
      populate: ["channel"]
    });
    if (currentMember?.channel) {
      const cid = currentMember.channel.id || currentMember.channel;
      channelIds.add(cid);
    }
    return Array.from(channelIds);
  },
  /**
   * 角色等级映射
   */
  ROLE_LEVELS: { owner: 30, admin: 20, member: 10 },
  /**
   * 检查用户是否有渠道访问权限
   */
  async checkUserChannelPermission(userId, channelId) {
    const allChannels = await this.getUserAllChannels(userId);
    return allChannels.includes(channelId);
  },
  /**
   * 获取用户在指定渠道的 channel-member 角色及等级值
   */
  async getChannelMemberRole(userId, channelId) {
    const member = await strapi.db.query(CHANNEL_MEMBER_UID$1).findOne({
      where: { user: userId, channel: channelId }
    });
    if (!member) return null;
    const levels = { owner: 30, admin: 20, member: 10 };
    return {
      role: member.role,
      level: levels[member.role] || 0,
      isCurrent: member.isCurrent
    };
  },
  /**
   * 检查用户角色是否达到指定等级
   */
  async checkChannelMemberRole(userId, channelId, minLevel) {
    const memberRole = await this.getChannelMemberRole(userId, channelId);
    if (!memberRole) return false;
    return memberRole.level >= minLevel;
  }
});
const USER_INVITE_UID = "plugin::zhao-channel.user-invite";
const USER_UID = "plugin::users-permissions.user";
const CHANNEL_UID = "plugin::zhao-channel.channel";
const CHANNEL_MEMBER_UID = "plugin::zhao-channel.channel-member";
const MAX_DISTRIBUTION_DEPTH = 2;
function generateInviteCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}
const userInvite = ({ strapi }) => ({
  /**
   * 生成未使用的邀请码（最多重试 5 次避免碰撞）
   */
  async generateUniqueCode() {
    for (let i = 0; i < 5; i++) {
      const code = generateInviteCode();
      const existing = await strapi.db.query(USER_INVITE_UID).findOne({
        where: { inviteCode: code }
      });
      if (!existing) return code;
    }
    return Math.random().toString(36).substring(2, 12).toUpperCase();
  },
  /**
   * 为用户创建 user-invite 记录
   * @param userId 用户 ID
   * @param inviterCode 邀请码（可选，被邀请时传入）
   * @param inviteChannelId 邀请人所属渠道 ID（可选）
   * @param externalInviteCode 外部邀请码（可选，SSO 生成时直接使用，跳过本地生成）
   * @param channelCode 渠道编码（可选，优先于 inviteChannelId，自动解析为 channelId）
   */
  async createForUser(userId, inviterCode, inviteChannelId, externalInviteCode, channelCode) {
    if (channelCode && !inviteChannelId) {
      const channel2 = await strapi.db.query(CHANNEL_UID).findOne({
        where: { code: channelCode }
      });
      if (channel2) inviteChannelId = channel2.id;
    }
    const inviteCode = externalInviteCode || await this.generateUniqueCode();
    let invitedBy = null;
    let inviteMethod = "organic";
    let inviteChannel = inviteChannelId || null;
    let distributionPath = `/${userId}/`;
    let distributionDepth = 0;
    if (inviterCode) {
      const inviterInvite = await strapi.db.query(USER_INVITE_UID).findOne({
        where: { inviteCode: inviterCode }
      });
      if (inviterInvite) {
        invitedBy = typeof inviterInvite.user === "object" ? inviterInvite.user.id : inviterInvite.user;
        inviteMethod = "invite_code";
        inviteChannel = inviterInvite.inviteChannel ? typeof inviterInvite.inviteChannel === "object" ? inviterInvite.inviteChannel.id : inviterInvite.inviteChannel : null;
        if ((inviterInvite.distributionDepth || 0) < MAX_DISTRIBUTION_DEPTH) {
          const parentPath = inviterInvite.distributionPath || "/";
          distributionPath = buildPath(parentPath, userId);
          distributionDepth = (inviterInvite.distributionDepth || 0) + 1;
        } else {
          distributionPath = `/${userId}/`;
          distributionDepth = 0;
        }
      }
    }
    if (!inviteChannel) {
      const currentMember = await strapi.db.query(CHANNEL_MEMBER_UID).findOne({
        where: { user: userId, isCurrent: true },
        populate: ["channel"]
      });
      if (currentMember?.channel) {
        inviteChannel = typeof currentMember.channel === "object" ? currentMember.channel.id : currentMember.channel;
      }
    }
    if (!inviteChannel && invitedBy) {
      const inviterMember = await strapi.db.query(CHANNEL_MEMBER_UID).findOne({
        where: { user: invitedBy, isCurrent: true },
        populate: ["channel"]
      });
      if (inviterMember?.channel) {
        inviteChannel = typeof inviterMember.channel === "object" ? inviterMember.channel.id : inviterMember.channel;
      }
    }
    const existing = await strapi.db.query(USER_INVITE_UID).findOne({
      where: { user: userId }
    });
    if (existing) {
      if (inviterCode && inviteMethod === "invite_code") {
        await strapi.db.query(USER_INVITE_UID).delete({
          where: { id: existing.id }
        });
      } else if (existing.inviteCode) {
        return existing;
      } else {
        await strapi.db.query(USER_INVITE_UID).update({
          where: { id: existing.id },
          data: { inviteCode }
        });
        return strapi.db.query(USER_INVITE_UID).findOne({
          where: { id: existing.id },
          populate: ["user", "invitedBy", "inviteChannel"]
        });
      }
    }
    const record = await strapi.db.query(USER_INVITE_UID).create({
      data: {
        user: userId,
        inviteCode,
        invitedBy,
        inviteChannel,
        inviteMethod,
        distributionPath,
        distributionDepth
      }
    });
    return strapi.db.query(USER_INVITE_UID).findOne({
      where: { id: record.id },
      populate: ["user", "invitedBy", "inviteChannel"]
    });
  },
  /**
   * 格式化邀请信息为 API 响应格式
   */
  formatInviteInfo(inviteInfo) {
    if (!inviteInfo) return null;
    return {
      myInviteCode: inviteInfo.inviteCode,
      invitedBy: inviteInfo.invitedBy ? typeof inviteInfo.invitedBy === "object" ? { id: inviteInfo.invitedBy.id } : { id: inviteInfo.invitedBy } : null,
      inviteMethod: inviteInfo.inviteMethod,
      distributionDepth: inviteInfo.distributionDepth,
      boundChannel: inviteInfo.inviteChannel ? typeof inviteInfo.inviteChannel === "object" ? { id: inviteInfo.inviteChannel.id, name: inviteInfo.inviteChannel.name } : null : null
    };
  },
  /**
   * 根据 inviteCode 查找用户
   */
  async findByInviteCode(code) {
    return strapi.db.query(USER_INVITE_UID).findOne({
      where: { inviteCode: code },
      populate: ["user", "invitedBy", "inviteChannel"]
    });
  },
  /**
   * 根据用户 ID 查找 user-invite 记录
   */
  async findByUserId(userId) {
    return strapi.db.query(USER_INVITE_UID).findOne({
      where: { user: userId },
      populate: ["user", "invitedBy", "inviteChannel"]
    });
  },
  /**
   * 获取用户的分销链（从自身向上 3 级）
   * 返回 [root, ... , self] 按深度升序排列
   */
  async getDistributionChain(userId) {
    const invite = await strapi.db.query(USER_INVITE_UID).findOne({
      where: { user: userId },
      populate: ["user", "invitedBy", "inviteChannel"]
    });
    if (!invite || !invite.distributionPath) return [];
    const userIds = parsePathIds(invite.distributionPath);
    const users = await strapi.db.query(USER_UID).findMany({
      where: { id: { $in: userIds } },
      select: ["id", "username", "email"]
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    return userIds.map((id, index2) => ({
      id,
      username: userMap.get(id)?.username || null,
      email: userMap.get(id)?.email || null,
      depth: index2
    }));
  },
  /**
   * 查询用户的下级分销用户列表（直接下级）
   */
  async getDirectDownstream(userId) {
    const invites = await strapi.db.query(USER_INVITE_UID).findMany({
      where: { invitedBy: userId },
      populate: ["user", "inviteChannel"]
    });
    return invites.map((inv) => ({
      userId: inv.user?.id,
      username: inv.user?.username,
      email: inv.user?.email,
      inviteCode: inv.inviteCode,
      inviteMethod: inv.inviteMethod,
      distributionDepth: inv.distributionDepth,
      boundChannel: inv.inviteChannel ? { id: inv.inviteChannel.id, name: inv.inviteChannel.name } : null,
      createdAt: inv.createdAt
    }));
  },
  /**
   * 查询用户的所有下级分销（递归，通过 distributionPath 前缀匹配）
   */
  async getAllDownstream(userId) {
    const invite = await strapi.db.query(USER_INVITE_UID).findOne({
      where: { user: userId }
    });
    if (!invite || !invite.distributionPath) return [];
    const prefix = invite.distributionPath.endsWith("/") ? invite.distributionPath : `${invite.distributionPath}/`;
    const downstream = await strapi.db.query(USER_INVITE_UID).findMany({
      where: {
        $and: [
          { distributionPath: { $startsWith: prefix } },
          { id: { $ne: invite.id } }
        ]
      },
      populate: ["user", "inviteChannel"]
    });
    return downstream.map((inv) => ({
      userId: inv.user?.id,
      username: inv.user?.username,
      email: inv.user?.email,
      depth: inv.distributionDepth,
      boundChannel: inv.inviteChannel ? { id: inv.inviteChannel.id, name: inv.inviteChannel.name } : null,
      createdAt: inv.createdAt
    }));
  },
  /**
   * 获取用户的分销统计
   */
  async getUserDistributionStats(userId) {
    const invite = await strapi.db.query(USER_INVITE_UID).findOne({
      where: { user: userId },
      populate: ["inviteChannel"]
    });
    if (!invite) return null;
    const chain = await this.getDistributionChain(userId);
    const directDownstream = await this.getDirectDownstream(userId);
    const allDownstream = await this.getAllDownstream(userId);
    return {
      userId,
      inviteCode: invite.inviteCode,
      inviteMethod: invite.inviteMethod,
      distributionDepth: invite.distributionDepth,
      distributionChain: chain,
      boundChannel: invite.inviteChannel ? { id: invite.inviteChannel.id, name: invite.inviteChannel.name } : null,
      stats: {
        directCount: directDownstream.length,
        totalDownstreamCount: allDownstream.length,
        maxDepth: chain.length > 0 ? chain.length - 1 : 0
      }
    };
  },
  /**
   * 简单 CRUD 方法（管理端用）
   */
  async find(query = {}) {
    const { page = 1, pageSize = 20, ...filters } = query;
    const results = await strapi.db.query(USER_INVITE_UID).findMany({
      where: filters,
      offset: (page - 1) * pageSize,
      limit: pageSize,
      populate: ["user", "inviteChannel"]
    });
    const total = await strapi.db.query(USER_INVITE_UID).count({ where: filters });
    return {
      data: results,
      pagination: { page: Number(page), pageSize: Number(pageSize), total, pageCount: Math.ceil(total / pageSize) }
    };
  },
  async findOne(id) {
    return strapi.db.query(USER_INVITE_UID).findOne({ where: { id }, populate: ["user", "inviteChannel"] });
  },
  async create(data) {
    return strapi.db.query(USER_INVITE_UID).create({ data });
  },
  async update(id, data) {
    return strapi.db.query(USER_INVITE_UID).update({ where: { id }, data });
  },
  async delete(id) {
    return strapi.db.query(USER_INVITE_UID).delete({ where: { id } });
  },
  /**
   * 使用邀请码（C 端入口）
   * 1. 校验邀请码有效性
   * 2. 创建渠道成员（非当前渠道）
   * 3. 授权关联渠道
   * 4. 更新邀请状态为 used
   */
  async useInvite(code, usedByUserId) {
    const invite = await strapi.db.query(USER_INVITE_UID).findOne({
      where: { code, status: "active" },
      populate: ["user", "inviteChannel"]
    });
    if (!invite) {
      throw new Error(`邀请码无效或已过期: ${code}`);
    }
    const channelMemberService = strapi.plugin("zhao-channel").service("channel-member");
    const member = await channelMemberService.useInvitationCode(
      usedByUserId,
      code
    );
    await strapi.db.query(USER_INVITE_UID).update({
      where: { id: invite.id },
      data: { status: "used" }
    });
    return member;
  },
  /**
   * 获取渠道维度的分销统计（用于替换 channel.getDistributionStats）
   */
  async getChannelDistributionStats(channelId) {
    const invites = await strapi.db.query(USER_INVITE_UID).findMany({
      where: { inviteChannel: channelId },
      populate: ["user"]
    });
    const channel2 = await strapi.db.query(CHANNEL_UID).findOne({
      where: { id: channelId }
    });
    let subChannelCustomerCount = 0;
    if (channel2?.path && channel2.path !== "/") {
      const { getDescendantIdsByPath: getDescendantIdsByPath2 } = await Promise.resolve().then(() => path);
      const descendantIds = await getDescendantIdsByPath2(strapi, channel2.path, true);
      if (descendantIds.length > 0) {
        const subInvites = await strapi.db.query(USER_INVITE_UID).count({
          where: { inviteChannel: { $in: descendantIds } }
        });
        subChannelCustomerCount = Number(subInvites);
      }
    }
    return {
      channelId,
      directCustomerCount: invites.length,
      subChannelCustomerCount,
      totalCustomerCount: invites.length + subChannelCustomerCount
    };
  }
});
const channelStatsService = ({ strapi }) => ({
  /**
   * 按渠道统计课程数
   */
  async getCourseStats(channelIds) {
    let total = 0;
    const byChannel = {};
    try {
      const allCourses = await strapi.documents("plugin::zhao-course.course").findMany({
        filters: { channelScope: "all" }
      });
      total += allCourses.length;
      for (const channelId of channelIds) {
        const courses = await strapi.documents("plugin::zhao-course.course").findMany({
          filters: {
            channelScope: "specific",
            channelIds: { $contains: channelId }
          }
        });
        byChannel[channelId] = courses.length;
        total += courses.length;
      }
    } catch {
      strapi.log.warn("[channel-stats] 课程统计查询失败");
    }
    return { total, byChannel };
  },
  /**
   * 按渠道统计用户数
   */
  async getUserStats(channelIds) {
    let total = 0;
    const byChannel = {};
    try {
      for (const channelId of channelIds) {
        const members = await strapi.documents("plugin::zhao-channel.channel-member").findMany({
          filters: { channel: { id: channelId } }
        });
        byChannel[channelId] = members.length;
        total += members.length;
      }
    } catch {
      strapi.log.warn("[channel-stats] 用户统计查询失败");
    }
    return { total, byChannel };
  },
  /**
   * 按渠道统计题库数
   */
  async getQuizStats(channelIds) {
    let total = 0;
    const byChannel = {};
    try {
      const allQuizzes = await strapi.documents("plugin::zhao-quiz.quiz").findMany({
        filters: { channelScope: "all" }
      });
      total += allQuizzes.length;
      for (const channelId of channelIds) {
        const quizzes = await strapi.documents("plugin::zhao-quiz.quiz").findMany({
          filters: {
            channelScope: "specific",
            channelIds: { $contains: channelId }
          }
        });
        byChannel[channelId] = quizzes.length;
        total += quizzes.length;
      }
    } catch {
      strapi.log.warn("[channel-stats] 题库统计查询失败");
    }
    return { total, byChannel };
  },
  /**
   * 按渠道统计积分发放量
   */
  async getPointStats(channelIds) {
    let total = 0;
    const byChannel = {};
    try {
      for (const channelId of channelIds) {
        const records = await strapi.documents("plugin::zhao-point.point-record").findMany({
          filters: { channel: { id: channelId } }
        });
        byChannel[channelId] = records.length;
        total += records.length;
      }
    } catch {
      strapi.log.warn("[channel-stats] 积分统计查询失败");
    }
    return { total, byChannel };
  },
  /**
   * 汇总仪表盘
   */
  async getDashboard(channelScope) {
    const channelIds = channelScope.all ? await this.getAllChannelIds() : channelScope.channelIds;
    const [courseStats, userStats, quizStats, pointStats] = await Promise.all([
      this.getCourseStats(channelIds),
      this.getUserStats(channelIds),
      this.getQuizStats(channelIds),
      this.getPointStats(channelIds)
    ]);
    return {
      totalCourses: courseStats.total,
      totalUsers: userStats.total,
      totalQuizzes: quizStats.total,
      totalPoints: pointStats.total,
      courseStats,
      userStats,
      quizStats,
      pointStats
    };
  },
  /**
   * 获取所有渠道ID（admin用）
   */
  async getAllChannelIds() {
    try {
      const channels = await strapi.documents("plugin::zhao-channel.channel").findMany({});
      return channels.map((c) => c.id);
    } catch {
      return [];
    }
  }
});
const services = {
  channel,
  "channel-member": channelMember,
  "channel-permission": channelPermission,
  "user-invite": userInvite,
  "channel-stats": channelStatsService
};
const index = {
  register,
  bootstrap,
  destroy,
  config: config$1,
  controllers,
  routes,
  services,
  contentTypes,
  policies,
  middlewares
};
export {
  index as default
};
