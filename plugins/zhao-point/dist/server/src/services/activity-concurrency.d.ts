/**
 * 活动并发/幂等硬化：把并发下的取舍抽成纯函数，便于单测锁死语义。
 * 所有函数不做 IO；入参一律为已读到的计数/返回值。
 */
/**
 * Strapi `updateMany` / `deleteMany` 返回 `{ count: N }`。
 * 归一为 number；异常形状（null / undefined / {} / NaN）回落 0。
 * 切勿对返回值直接 Number()——对象会被算成 NaN，导致认领判定失效。
 */
export declare function affectedCount(result: unknown): number;
export interface CancelOutcome {
    /** 是否本次取消的赢家（并发后到者为 false，不得产生任何副作用） */
    proceed: boolean;
    /** 是否发取消通知 */
    notify: boolean;
    /** 是否退报名费 */
    refund: boolean;
    /** 是否释放名额 */
    releaseSeat: boolean;
    /** 是否递补候补 */
    promoteWaitlist: boolean;
}
/**
 * 取消报名的并发认领结果 → 副作用取舍。
 * 两个并发 cancel 只有一个能把行从 active/waiting 改成 cancelled，
 * 后到者两项计数均为 0 → 不通知、不退款、不释放名额、不递补。
 */
export declare function cancelOutcome(counts: {
    active?: number;
    waiting?: number;
}): CancelOutcome;
