import type { Core } from "@strapi/strapi";

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("[zhao-track] 插件已加载");

  // 检查 zhao-deal 是否启用（跨插件依赖）
  try {
    const dealPlugin = strapi.plugin("zhao-deal");
    if (!dealPlugin) {
      strapi.log.warn("[zhao-track] zhao-deal 插件未启用，归因和链接置换功能将降级");
    }
  } catch {
    strapi.log.warn("[zhao-track] zhao-deal 插件未启用，归因和链接置换功能将降级");
  }

  // 检查 Redis 是否可用（用于 RateLimiter）
  try {
    const redis = (strapi as any).redis || (global as any).redis;
    if (redis) {
      strapi.log.info("[zhao-track] Redis 已检测到，RateLimiter 将使用 Redis 模式");
    } else {
      strapi.log.info("[zhao-track] Redis 未检测到，RateLimiter 将使用内存降级模式");
    }
  } catch {
    // ignore
  }
};

export default bootstrap;
