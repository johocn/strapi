import isAuthenticated from "./is-authenticated";
import tenantContextInjector from "./tenant-context-injector";
import hasPermission from "./has-permission";
import hasChannelAccess from "./has-channel-access";
import hasChannelScope from "./has-channel-scope";
import hasTenantAccess from "./has-tenant-access";

/**
 * 策略导出（Strapi 原生签名）
 *
 * 统一策略清单:
 * - is-authenticated: 认证检查（提取JWT + 验证 + 注入user）
 * - has-permission: 功能权限检查（config.action 指定权限动作）
 * - has-channel-access: 特定渠道访问权（需要 channelId）
 * - has-channel-scope: 渠道范围解析（非阻断，注入 channelScope）
 * - has-tenant-access: 租户访问校验（siteId 与用户渠道交集校验）
 */
export default {
  "is-authenticated": isAuthenticated,
  "tenant-context-injector": tenantContextInjector,
  "has-permission": hasPermission,
  "has-channel-access": hasChannelAccess,
  "has-channel-scope": hasChannelScope,
  "has-tenant-access": hasTenantAccess,
};
