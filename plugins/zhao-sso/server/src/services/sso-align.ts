import type { Core } from "@strapi/strapi";

const USER_UID = "plugin::zhao-sso.sso-user";

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
export default ({ strapi }: { strapi: Core.Strapi }) => {
  async function backfillUsers(onlySsoUserIds?: number[]) {
    const q = strapi.db.query(USER_UID);
    const users = onlySsoUserIds?.length
      ? await q.findMany({ where: { id: { $in: onlySsoUserIds } }, limit: 2000 })
      : await q.findMany({ limit: 2000 });

    const knex = strapi.db.connection;
    const inviteSvc = strapi.plugin("zhao-sso").service("sso-invite") as any;
    const sync = strapi.plugin("zhao-sso").service("channel-sync")?.getSync?.() ?? null;

    let ok = 0;
    let err = 0;
    for (const u of users) {
      try {
        // 1. 本人自有码：优先主商城（vendure-youshop），无则 course 兜底 —— 与 /v1/user/me
        //    返回的 ownInviteCode 优先级、微信登录链补齐逻辑保持一致，保证各入口同码。
        let ownCode = (await inviteSvc?.ensureOwnInviteCode?.(u.id, "vendure-youshop")) || "";
        if (!ownCode) ownCode = (await inviteSvc?.ensureOwnInviteCode?.(u.id, "course")) || "";

        // 2. up_users 对齐（优先按 sso_id 匹配，其次按主键 id 匹配，幂等覆盖）
        const patch: any = { sso_id: u.id, updated_at: new Date() };
        if (ownCode) patch.invite_code = ownCode;
        if (u.nickname) patch.nickname = u.nickname;
        const matchedBySsoId = await knex("up_users").where({ sso_id: u.id }).first();
        await knex("up_users")
          .where(matchedBySsoId ? { sso_id: u.id } : { id: u.id })
          .update(patch);

        // 3. zhao_user_invites 分销记录（externalInviteCode=自有码，空邀请人码不建立上级链）
        if (sync?.syncUserInvite) await sync.syncUserInvite(u.id, undefined, undefined);
        ok++;
      } catch (e: any) {
        err++;
        strapi.log.warn(`[zhao-sso] backfill sso_user ${u.id} failed: ${e?.message}`);
      }
    }
    strapi.log.info(`[zhao-sso] invite backfill done: total=${users.length} ok=${ok} err=${err}`);
    return { total: users.length, ok, err };
  }

  return { backfillUsers };
};