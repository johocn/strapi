import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    list(ctx: any): Promise<void>;
    detail(ctx: any): Promise<void>;
    signup(ctx: any): Promise<void>;
    cancel(ctx: any): Promise<void>;
    checkin(ctx: any): Promise<void>;
    mySignups(ctx: any): Promise<void>;
    adminList(ctx: any): Promise<void>;
    adminCreate(ctx: any): Promise<void>;
    adminUpdate(ctx: any): Promise<void>;
    adminDelete(ctx: any): Promise<void>;
    adminSignups(ctx: any): Promise<void>;
    adminCancelSignup(ctx: any): Promise<void>;
    adminScanCheckin(ctx: any): Promise<void>;
    adminAttendance(ctx: any): Promise<void>;
    /** 裂变榜：按 inviter 聚合奖励记录，可筛时间；返回带来报名数/发放积分/明细 */
    fissionLeaderboard(ctx: any): Promise<void>;
};
export default _default;
