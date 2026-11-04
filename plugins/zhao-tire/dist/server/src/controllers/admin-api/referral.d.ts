declare const _default: {
    /** 列表查询：GET /admin/referral-codes?code=&phone=&page=&pageSize= */
    find(ctx: any): Promise<void>;
    /** 更新基础信息：PATCH /admin/referral-codes/:id */
    update(ctx: any): Promise<void>;
    /** 手动发放免单次数：POST /admin/referral-codes/:id/grant-free */
    grantFree(ctx: any): Promise<void>;
    /** 邀请记录明细：直接查 tire-share-record，服务端分页与筛选 */
    shareRecords(ctx: any): Promise<void>;
    /** 邀请记录导出 CSV（服务端筛选，最多 5000 行） */
    exportShareRecords(ctx: any): Promise<void>;
    /** 奖励券台账（tire-referral-reward 直查） */
    rewards(ctx: any): Promise<void>;
};
export default _default;
