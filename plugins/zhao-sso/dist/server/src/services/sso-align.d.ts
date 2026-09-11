import { Core } from '@strapi/strapi';
/**
 * 存量对齐（一次性回填，幂等）
 *
 * 目标（四层同码的底座）：
 *   1. 每个 sso_user 都有自有邀请码（sso_invite_codes.code，creator=本人）；
 *   2. 把 sso_id / invite_code / nickname 对齐写入 up_users；
 *   3. 经 channel-sync 在 zhao_user_invites 建立分销记录，invite_code 取自有码（三码统一）。
 *
 * 幂等依据：ensureOwnInviteCode 已有码直接返回不重复建码；up_users 直写覆盖；
 *   createForUser(externalInviteCode=自有码) 可反复执行，最终值为自有码。
 * Vendure customer 侧（ssoId / referralCode）由 sso 认证链在登录时按此底座对齐，无需在此改库。
 */
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    backfillUsers: (onlySsoUserIds?: number[]) => Promise<{
        total: number;
        ok: number;
        err: number;
    }>;
};
export default _default;
