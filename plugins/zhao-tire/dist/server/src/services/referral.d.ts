import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /** 获取或创建某手机号的邀请码（返回邀请码 + 计数 + 奖励情况） */
    ensureForPhone(phone: string, nickname?: string): Promise<any>;
    /** 校验邀请码是否存在，返回码的归属手机号；不存在抛错 */
    validate(referralCode: string): Promise<any>;
    /**
     * 下单后绑定邀请关系（订单创建成功后调用）
     * - 禁止自邀
     * - 同一手机号 / openid / 设备只能绑定一个邀请人
     * - 单邀请人每日绑定上限，超限进 pending_review
     * - 被邀请人仅首单可绑定
     */
    attachReferral(order: any, referralCode: string, extra?: {
        openid?: string;
        deviceId?: string;
        ip?: string;
    }): Promise<any>;
    /** 被邀请人入库成功：把邀请置为有效并触发「每满 3 人发 1 次」 */
    markValidOnInbound(orderNo: string): Promise<{
        duplicated: boolean;
        record: any;
        skipped?: undefined;
        reason?: undefined;
        referralCode?: undefined;
        referrerPhone?: undefined;
        completedCount?: undefined;
        rewarded?: undefined;
        reward?: undefined;
        pendingFreeCount?: undefined;
        recordId?: undefined;
    } | {
        skipped: boolean;
        reason: any;
        record: any;
        duplicated?: undefined;
        referralCode?: undefined;
        referrerPhone?: undefined;
        completedCount?: undefined;
        rewarded?: undefined;
        reward?: undefined;
        pendingFreeCount?: undefined;
        recordId?: undefined;
    } | {
        referralCode: any;
        referrerPhone: any;
        completedCount: number;
        rewarded: boolean;
        reward: any;
        pendingFreeCount: number;
        recordId: any;
        duplicated?: undefined;
        record?: undefined;
        skipped?: undefined;
        reason?: undefined;
    }>;
    /**
     * 发放一次免单额度（基础套餐费，受单次封顶 / 年度上限约束）
     * - 额度快照 = min(基础套餐价, referralRewardCap)
     * - cap = 0 时表示不封顶
     * - debtCount > 0 时先抵消欠账，不发新券
     */
    issueReward(rc: any, options?: {
        source?: string;
        note?: string;
        force?: boolean;
    }): Promise<{
        issued: boolean;
        debt: boolean;
        reason: string;
        reward?: undefined;
        amount?: undefined;
    } | {
        issued: boolean;
        reason: string;
        debt?: undefined;
        reward?: undefined;
        amount?: undefined;
    } | {
        issued: boolean;
        reward: any;
        amount: number;
        debt?: undefined;
        reason?: undefined;
    }>;
    /**
     * 下单时预占一张奖励券（避免并发重复使用）
     * 返回 { rewardNo, discount, amount }；无可用券返回 null
     */
    reserveReward(phone: string, amountPackage: number): Promise<{
        rewardNo: any;
        discount: number;
        amount: number;
        reward: any;
    }>;
    /** 订单创建成功后把预占券绑定到订单 */
    bindReward(rewardNo: string, orderNo: string): Promise<any>;
    /** 订单创建失败时释放预占券 */
    releaseReward(rewardNo: string): Promise<any>;
    /** 查询某手机号的可用奖励券（前端展示） */
    listRewards(phone: string): Promise<{
        rewards: {
            rewardNo: any;
            amount: number;
            source: any;
            status: any;
            issuedAt: any;
            expiresAt: any;
            usedOrderNo: any;
        }[];
        available: {
            rewardNo: any;
            amount: number;
            source: any;
            status: any;
            issuedAt: any;
            expiresAt: any;
            usedOrderNo: any;
        }[];
    }>;
    /** 退款回滚：作废该订单产生的有效邀请与未使用奖励 */
    rollbackForOrder(orderNo: string): Promise<{
        rolledBack: boolean;
        completedCount?: undefined;
        pendingFreeCount?: undefined;
        debtCount?: undefined;
    } | {
        rolledBack: boolean;
        completedCount: number;
        pendingFreeCount: number;
        debtCount: number;
    }>;
    /** 订单退款后归还该单使用的奖励券 */
    restoreUsedReward(order: any): Promise<{
        rewardNo: any;
    }>;
    /**
     * 兼容旧接口：支付完成时累加计数（新流程已改为入库触发）
     */
    markCompleted(orderNo: string): Promise<{
        duplicated: boolean;
        record: any;
        skipped?: undefined;
        reason?: undefined;
        referralCode?: undefined;
        referrerPhone?: undefined;
        completedCount?: undefined;
        rewarded?: undefined;
        reward?: undefined;
        pendingFreeCount?: undefined;
        recordId?: undefined;
    } | {
        skipped: boolean;
        reason: any;
        record: any;
        duplicated?: undefined;
        referralCode?: undefined;
        referrerPhone?: undefined;
        completedCount?: undefined;
        rewarded?: undefined;
        reward?: undefined;
        pendingFreeCount?: undefined;
        recordId?: undefined;
    } | {
        referralCode: any;
        referrerPhone: any;
        completedCount: number;
        rewarded: boolean;
        reward: any;
        pendingFreeCount: number;
        recordId: any;
        duplicated?: undefined;
        record?: undefined;
        skipped?: undefined;
        reason?: undefined;
    }>;
    /** 兼容旧接口：扣减一次免单额度，返回是否成功 */
    consumeFree(phone: string): Promise<boolean>;
    /** 查询某手机号的邀请码详情 + 奖励进度（前端"我的邀请码"页用） */
    getProfile(phone: string): Promise<any>;
};
export default _default;
