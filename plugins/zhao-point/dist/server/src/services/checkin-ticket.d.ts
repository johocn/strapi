/** 票据有效期：5 分钟 */
export declare const TICKET_TTL_MS: number;
/** 二维码文本前缀 */
export declare const TICKET_PREFIX = "atk:";
/** 生成票据 token：24 字节随机 hex（48 字符） */
export declare function newTicketToken(): string;
export type ScanPayload = {
    kind: "ticket";
    token: string;
} | {
    kind: "legacy";
} | {
    kind: "invalid";
};
/** 解析扫码文本：只认 atk:{48位hex}；旧明文码单独识别 */
export declare function decodeScanText(text: unknown): ScanPayload;
/**
 * 校验结果。插件 tsconfig 继承 Strapi 基线（`strict: false` → strictNullChecks 关闭），
 * 判别式联合在此配置下不会收窄，故用带可选字段的接口，避免消费者访问 code/message 报 TS2339。
 */
export interface TicketCheck {
    ok: boolean;
    code?: string;
    httpStatus?: number;
    message?: string;
}
/**
 * 核销前校验：状态 → 时效 → 活动归属。
 * 全部通过才允许调用 checkin()，因此任何失败路径都不会发放签到积分。
 */
export declare function validateTicket(ticket: {
    status?: string | null;
    expiresAt?: string | Date | null;
    activity?: number | null;
} | null | undefined, opts: {
    activityId: number;
    now?: number;
}): TicketCheck;
/** 手动核销理由校验：trim 后至少 2 个字符 */
export declare function validateManualReason(reason: unknown): TicketCheck;
/** 已过期但仍 pending 的票据是否应转为 expired（惰性清理，不引 cron） */
export declare function shouldExpire(ticket: {
    status?: string | null;
    expiresAt?: string | Date | null;
} | null | undefined, now?: number): boolean;
