"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const is_authenticated_1 = __importDefault(require("./is-authenticated"));
const tenant_context_injector_1 = __importDefault(require("./tenant-context-injector"));
const has_permission_1 = __importDefault(require("./has-permission"));
const has_channel_access_1 = __importDefault(require("./has-channel-access"));
const has_channel_scope_1 = __importDefault(require("./has-channel-scope"));
const has_tenant_access_1 = __importDefault(require("./has-tenant-access"));
/**
 * 策略导出（Strapi 原生签名）
 *
 * 统一策略清单:
 * - is-authenticated: 认证检查（提取JWT + 验证 + 注入user）
 * - has-permission: 功能权限检查（config.action 指定权限动作）
 * - has-channel-access: 特定渠道访问权（需要 channelId）
 * - has-channel-scope: 渠道范围解析（非阻断，注入 channelScope）
 * - has-tenant-access: 租户访问校验（siteId 与用户渠道交集校验）
 *
 * 已废弃策略（不再导出）:
 * - has-channel-access-advanced → has-permission + has-channel-scope
 * - is-channel-admin → has-permission(action: "channel.update")
 * - is-channel-owner → has-permission(action: "channel.delete")
 * - has-auth-permission → has-permission
 * - has-role → has-permission（通过权限树角色映射）
 * - has-oss-permission → has-permission(action: "oss.xxx")
 */
exports.default = {
    "is-authenticated": is_authenticated_1.default,
    "tenant-context-injector": tenant_context_injector_1.default,
    "has-permission": has_permission_1.default,
    "has-channel-access": has_channel_access_1.default,
    "has-channel-scope": has_channel_scope_1.default,
    "has-tenant-access": has_tenant_access_1.default,
};
