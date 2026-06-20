import isAuthenticated from "./is-authenticated";
import hasPermission from "./has-permission";
import hasChannelAccess from "./has-channel-access";
import hasChannelScope from "./has-channel-scope";

/**
 * 策略导出（Strapi 原生签名）
 *
 * 统一策略清单:
 * - is-authenticated: 认证检查（提取JWT + 验证 + 注入user）
 * - has-permission: 功能权限检查（config.action 指定权限动作）
 * - has-channel-access: 特定渠道访问权（需要 channelId）
 * - has-channel-scope: 渠道范围解析（非阻断，注入 channelScope）
 *
 * 已废弃策略（不再导出）:
 * - has-channel-access-advanced → has-permission + has-channel-scope
 * - is-channel-admin → has-permission(action: "channel.update")
 * - is-channel-owner → has-permission(action: "channel.delete")
 * - has-auth-permission → has-permission
 * - has-role → has-permission（通过权限树角色映射）
 * - has-oss-permission → has-permission(action: "oss.xxx")
 */
export default {
  "is-authenticated": isAuthenticated,
  "has-permission": hasPermission,
  "has-channel-access": hasChannelAccess,
  "has-channel-scope": hasChannelScope,
};
