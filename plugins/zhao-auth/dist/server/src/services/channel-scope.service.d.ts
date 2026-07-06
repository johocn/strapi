import { Core } from '@strapi/strapi';
export interface ChannelScope {
    all: boolean;
    channelIds: number[];
}
/**
 * 渠道范围服务（位于 zhao-auth）
 * 解析用户可见的渠道范围，供 has-channel-scope 策略和各插件调用
 *
 * 核心逻辑复用 zhao-channel 的 channel-permission.getUserAllChannels
 * （含 user-channel + role-channel + channel-member + path 下级扩展 + Redis 缓存）
 */
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 解析用户可见渠道范围
     * @param user 用户对象（含 id, roles）
     * @returns ChannelScope
     */
    resolve(user: any): Promise<ChannelScope>;
    /**
     * 构造 filters 中的 channel 过滤条件（纯函数，不调用 resolve）
     * @param scope 渠道范围（来自 ctx.state.channelScope）
     * @param field 关系字段名："channel"（manyToOne）/ "channels"（manyToMany）/ "id"（channel 自身）
     * @returns 过滤条件对象；null 表示不过滤
     */
    buildChannelFilter(scope: ChannelScope | undefined, field: string): Record<string, any> | null;
    /**
     * 校验单条记录的 channel 关系是否在 scope 内（纯函数）
     * @param scope 渠道范围
     * @param record 含 channel 关系的记录
     * @param field 关系字段名："channel"（对象）/ "channels"（数组）/ "id"（channel 自身，数字）
     * @throws 403 当记录的 channel 不在 scope 内
     */
    assertRecordInScope(scope: ChannelScope | undefined, record: any, field: string): void;
    /**
     * 通过 channel documentId 校验是否在 scope 内（async，需查 DB）
     * @param scope 渠道范围
     * @param channelDocumentId channel 的 documentId
     * @throws 403 当 channel 不在 scope 内
     */
    assertChannelDocIdInScope(scope: ChannelScope | undefined, channelDocumentId: string): Promise<void>;
    /**
     * 构造嵌套关系过滤条件（纯函数，用于间接渠道关联）
     * @param scope 渠道范围
     * @param path 关系路径数组，如 ["course", "channel"] 生成 { course: { channel: { id: { $in: ids } } } }
     * @returns 过滤条件对象；null 表示不过滤
     */
    buildChannelFilterDeep(scope: ChannelScope | undefined, path: string[]): Record<string, any> | null;
};
export default _default;
