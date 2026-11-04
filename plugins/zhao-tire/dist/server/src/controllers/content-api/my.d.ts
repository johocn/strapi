declare const _default: {
    me(ctx: any): Promise<void>;
    orders(ctx: any): Promise<void>;
    referral(ctx: any): Promise<void>;
    rewards(ctx: any): Promise<void>;
    /** 我的邀请明细（仅本人作为分享人的记录），服务端分页 */
    shareRecords(ctx: any): Promise<void>;
};
export default _default;
