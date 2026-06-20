import type { Core } from "@strapi/strapi";

/**
 * 国际化消息映射（中文默认）
 * 后续可扩展为从配置加载多语言文件
 */
const MESSAGES: Record<string, string> = {
  // ── 通用 ──
  COMMON_001: "未知错误",
  COMMON_002: "参数校验失败: {reason}",
  COMMON_003: "资源不存在: {resource}",
  COMMON_004: "无权限访问",
  COMMON_005: "认证失败",
  COMMON_006: "配置错误: {detail}",

  // ── 渠道 ──
  CHANNEL_001: "渠道不存在 (id={channelId})",
  CHANNEL_002: "渠道层级深度超限（最大 2 级）",
  CHANNEL_003: "渠道已被禁用",
  CHANNEL_004: "邀请码不存在或已过期",
  CHANNEL_005: "成员不存在",
  CHANNEL_006: "渠道名已存在: {name}",
  CHANNEL_007: "用户未关联渠道",

  // ── 认证 ──
  AUTH_001: "缺少认证令牌",
  AUTH_002: "令牌无效或已过期",
  AUTH_003: "角色权限不足 (需要: {roles})",
  AUTH_004: "无权访问该渠道",
  AUTH_005: "资源所有者不匹配",
};

export interface I18n {
  /** 根据错误码获取本地化消息 */
  t(code: string, params?: Record<string, unknown>): string;
  /** 添加或覆盖消息 */
  setMessages(messages: Record<string, string>): void;
}

export default ({ strapi: _strapi }: { strapi: Core.Strapi }): I18n => {
  let messages = { ...MESSAGES };

  return {
    t(code: string, params?: Record<string, unknown>): string {
      let message = messages[code] || code;
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          message = message.replace(`{${key}}`, String(value));
        }
      }
      return message;
    },

    setMessages(newMessages: Record<string, string>) {
      messages = { ...messages, ...newMessages };
    },
  };
};