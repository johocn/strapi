import { Core } from '@strapi/strapi';
export interface I18n {
    /** 根据错误码获取本地化消息 */
    t(code: string, params?: Record<string, unknown>): string;
    /** 添加或覆盖消息 */
    setMessages(messages: Record<string, string>): void;
}
declare const _default: ({ strapi: _strapi }: {
    strapi: Core.Strapi;
}) => I18n;
export default _default;
