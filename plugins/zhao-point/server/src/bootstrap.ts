import type { Core } from "@strapi/strapi";
import { collectMissingRules } from "./services/seed-rules";

const RULE_UID = "plugin::zhao-point.point-rule";

// 到场记录（activity_attendances）的约束全部只能在 DB 层落地：
// ① 与报名的关系走 Strapi 链接表，该表自带 _uq(activity_attendance_id, activity_signup_id)
//    只保证「同一条链接不重复」，挡不住同一 signup 挂两条 attendance，也挡不住一条
//    attendance 挂两条 signup（schema 声明的 oneToOne 在 DB 层没有对应约束）；
// ② schema.json 的 required / unique / default 只做应用层校验，实测均不落库
//    （activity-checkin-ticket.token 声明了 unique+required，DB 列仍可空且无唯一索引）。
// 另：Strapi 的 schema sync 每次启动会无条件比较列的 notNullable / defaultTo
// （@strapi/database/dist/schema/diff.js diffColumns），会把列约束 diff 回可空，
// 故列级 NOT NULL 必须在 sync 之后的 bootstrap 阶段重新收紧；索引与 CHECK 不在
// Strapi 管理的对象集合内（diff 的删除分支要求该对象存在于 previousTable），建好即稳定。
const ATT_TABLE = "activity_attendances";
const ATT_LNK_TABLE = "activity_attendances_signup_lnk";
const ATT_METHOD_CHECK = "activity_attendances_method_check";
const ATT_LNK_SIGNUP_INDEX = "activity_attendances_signup_lnk_suq";
const ATT_LNK_ATTENDANCE_INDEX = "activity_attendances_signup_lnk_auq";
const TICKET_TABLE = "activity_checkin_tickets";
const TICKET_TOKEN_INDEX = "activity_checkin_tickets_token_suq";
const SIGNS_TABLE = "activity_signups";
const SIGNS_ACTIVITY_USER_INDEX = "activity_signups_activity_user_uq";

/**
 * 幂等补建「同一用户同一活动至多一条有效报名」的 DB 兜底。
 * 关系落在 lnk 表，DB 无法跨表建唯一约束，故用 activity_id / user_id 冗余列
 * （镜像关系目标 id，由 signup() 的报名链路写入）+ 部分唯一索引。
 * 取消后重新报名会新建一行（signup() 只对 active/waiting 判重），故只约束 active/waiting；
 * 日后新增 status 枚举值时必须同步复核该谓词。
 */
const ensureSignupUniqueGuard = async (strapi: Core.Strapi) => {
  const knex = strapi.db.connection;
  const dup = await knex(SIGNS_TABLE)
    .whereIn("status", ["active", "waiting"])
    .whereNotNull("activity_id")
    .whereNotNull("user_id")
    .select("activity_id", "user_id")
    .groupBy("activity_id", "user_id")
    .havingRaw("count(*) > 1")
    .limit(5);
  if (Array.isArray(dup) && dup.length > 0) {
    const pairs = dup.map((d: any) => `${d.activity_id}/${d.user_id}`).join(",");
    strapi.log.warn(`[zhao-point] ${SIGNS_TABLE} 存在重复有效报名(活动/用户=${pairs})，跳过唯一索引，请先人工核账`);
  } else {
    await knex.raw(
      `CREATE UNIQUE INDEX IF NOT EXISTS ${SIGNS_ACTIVITY_USER_INDEX} ON ${SIGNS_TABLE} (activity_id, user_id) WHERE status IN ('active', 'waiting')`
    );
    strapi.log.info(`[zhao-point] 报名唯一性兜底已就绪 (${SIGNS_ACTIVITY_USER_INDEX})`);
  }

  const nullRow = await knex(SIGNS_TABLE).whereNull("activity_id").orWhereNull("user_id").count({ n: "*" }).first();
  const nullCount = Number((nullRow as any)?.n ?? 0) || 0;
  if (nullCount > 0) {
    strapi.log.warn(`[zhao-point] ${SIGNS_TABLE} 有 ${nullCount} 行缺少 activity_id/user_id，跳过 NOT NULL，请先回填`);
    return;
  }
  await knex.raw(`ALTER TABLE ${SIGNS_TABLE} ALTER COLUMN activity_id SET NOT NULL`);
  await knex.raw(`ALTER TABLE ${SIGNS_TABLE} ALTER COLUMN user_id SET NOT NULL`);
  strapi.log.info(`[zhao-point] 报名镜像列已收紧为 NOT NULL (${SIGNS_TABLE}: activity_id/user_id)`);
};

/**
 * 幂等补建单列唯一索引。
 * 先查重（NULL 不参与比较）：已有重复值只告警并跳过，绝不阻断启动（交人工核账后重试）。
 */
const ensureUniqueIndex = async (strapi: Core.Strapi, table: string, column: string, indexName: string) => {
  const knex = strapi.db.connection;
  const dup = await knex(table)
    .whereNotNull(column)
    .select(column)
    .groupBy(column)
    .havingRaw("count(*) > 1")
    .limit(5);
  if (Array.isArray(dup) && dup.length > 0) {
    const vals = dup.map((d: any) => d[column]).join(",");
    strapi.log.warn(`[zhao-point] ${table}.${column} 存在重复值(${vals})，跳过唯一索引 ${indexName}，请先人工核账`);
    return;
  }
  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS ${indexName} ON ${table} (${column})`);
  strapi.log.info(`[zhao-point] 唯一索引已就绪 (${indexName})`);
};

/**
 * 幂等收紧到场记录的列约束（详见文件头注释：schema 不落库，且每轮启动会被 sync 改回可空）。
 * 有违例数据时逐列告警跳过，不阻断启动。
 */
const ensureAttendanceColumnConstraints = async (strapi: Core.Strapi) => {
  const knex = strapi.db.connection;
  const countNull = async (column: string) => {
    const row = await knex(ATT_TABLE).whereNull(column).count({ n: "*" }).first();
    return Number((row as any)?.n ?? 0) || 0;
  };

  for (const column of ["checkin_at", "geo_passed", "points_granted"]) {
    const n = await countNull(column);
    if (n > 0) {
      strapi.log.warn(`[zhao-point] ${ATT_TABLE}.${column} 有 ${n} 行空值，跳过 NOT NULL，请先人工核账`);
      continue;
    }
    await knex.raw(`ALTER TABLE ${ATT_TABLE} ALTER COLUMN ${column} SET NOT NULL`);
  }
  // DB 默认值：写入侧始终显式赋值，默认值仅供直连 SQL 兜底（避免布尔列三态）
  await knex.raw(`ALTER TABLE ${ATT_TABLE} ALTER COLUMN geo_passed SET DEFAULT true`);
  await knex.raw(`ALTER TABLE ${ATT_TABLE} ALTER COLUMN points_granted SET DEFAULT false`);
  strapi.log.info(
    `[zhao-point] 到场记录列约束已就绪 (${ATT_TABLE}: checkin_at/geo_passed/points_granted NOT NULL)`
  );

  // method 值域：Strapi enumeration 不建 DB CHECK，补一条防绕过应用层的脏值
  const hasCheck = await knex("pg_constraint").where({ conname: ATT_METHOD_CHECK }).first();
  if (!hasCheck) {
    await knex.raw(
      `ALTER TABLE ${ATT_TABLE} ADD CONSTRAINT ${ATT_METHOD_CHECK} CHECK (method IN ('worker_scan', 'self', 'manual'))`
    );
    strapi.log.info(`[zhao-point] method 值域约束已创建 (${ATT_METHOD_CHECK})`);
  }
};

/**
 * 幂等收紧票据 token 为 NOT NULL（一次性凭据防重放底线）。
 * 有 NULL 行时告警跳过，不阻断启动。
 */
const ensureTicketTokenNotNull = async (strapi: Core.Strapi) => {
  const knex = strapi.db.connection;
  const row = await knex(TICKET_TABLE).whereNull("token").count({ n: "*" }).first();
  const n = Number((row as any)?.n ?? 0) || 0;
  if (n > 0) {
    strapi.log.warn(`[zhao-point] ${TICKET_TABLE}.token 有 ${n} 行空值，跳过 NOT NULL，请先人工核账`);
    return;
  }
  await knex.raw(`ALTER TABLE ${TICKET_TABLE} ALTER COLUMN token SET NOT NULL`);
  strapi.log.info(`[zhao-point] 票据 token 已收紧为 NOT NULL (${TICKET_TABLE})`);
};

/**
 * 启动期 ID 序列自愈：历史上存在显式 id 插入（导入/同步）导致 serial 序列落后于 max(id)，
 * 后续任何 insert 都会撞主键冲突（生产已实际发生：新用户注册 100% 失败）。
 * 幂等：仅当序列「下一个 nextval 会 <= max(id)」时 setval；每次启动巡检全部 public 表，修复明细打 warn。
 * last_value 语义依赖 is_called：is_called=true 时下一值为 last_value+1；false 时下一值为 last_value 本身。
 * 故漏判条件为：is_called ? last_value < max(id) : last_value <= max(id)。
 */
const healIdSequences = async (strapi: Core.Strapi) => {
  const knex = strapi.db.connection;
  const res: any = await knex.raw(`
    SELECT c.relname AS tbl,
           pg_get_serial_sequence('public.' || quote_ident(c.relname), 'id') AS seq
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  `);
  const list: Array<{ tbl: string; seq: string | null }> = (res?.rows ?? res) || [];
  const healed: string[] = [];
  for (const { tbl, seq } of list) {
    if (!seq) continue;
    const maxRes: any = await knex.raw("SELECT COALESCE(max(id), 0) AS mx FROM ??", [tbl]);
    const mx = Number(((maxRes?.rows ?? maxRes) || [])[0]?.mx ?? 0);
    const seqRes: any = await knex.raw(`SELECT last_value, is_called FROM ${seq}`);
    const row = ((seqRes?.rows ?? seqRes) || [])[0] ?? {};
    const lv = Number(row.last_value ?? 0);
    const isCalled = Boolean(row.is_called);
    if ((isCalled && lv < mx) || (!isCalled && lv <= mx)) {
      await knex.raw("SELECT setval(?, ?)", [seq, mx]);
      healed.push(`${tbl}:${lv}(called=${isCalled})->${mx}`);
    }
  }
  if (healed.length > 0) {
    strapi.log.warn(`[zhao-point] 修复落后 ID 序列 ${healed.length} 个: ${healed.join(", ")}`);
  }
};

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("[zhao-point] 插件已加载，开始种子数据检查...");

  // 与种子配置无关的启动兜底必须放在种子块的 early-return 之前，否则会被跳过：
  // Strapi 5 的 plugins loader 会把 plugin.config 覆写为「已解包」的 default 导出
  // （见 @strapi/core loaders/plugins applyUserConfig），故 config("default") 恒为
  // undefined，种子块实际从不执行，其后的代码同样从不执行。
  // 启动兜底：推进已到期但未流转的活动（懒加载流转的历史积压）
  try {
    const actSvc = strapi.plugin("zhao-point").service("activity");
    if (actSvc?.drainDueActivities) await actSvc.drainDueActivities();
  } catch (err: any) {
    strapi.log.warn(`[zhao-point] 启动 drain 失败: ${err.message}`);
  }

  // 启动兜底：补建到场记录相关约束（幂等 DDL）
  try {
    await ensureAttendanceColumnConstraints(strapi);
  } catch (err: any) {
    strapi.log.warn(`[zhao-point] 到场记录列约束创建失败: ${err.message}`);
  }

  try {
    // 一条报名至多一条到场记录 / 一条到场记录只对应一条报名（对齐 schema 的 oneToOne）
    await ensureUniqueIndex(strapi, ATT_LNK_TABLE, "activity_signup_id", ATT_LNK_SIGNUP_INDEX);
    await ensureUniqueIndex(strapi, ATT_LNK_TABLE, "activity_attendance_id", ATT_LNK_ATTENDANCE_INDEX);
    // 到场核销票据 token：一次性凭据的唯一性/防重放底线
    await ensureUniqueIndex(strapi, TICKET_TABLE, "token", TICKET_TOKEN_INDEX);
  } catch (err: any) {
    strapi.log.warn(`[zhao-point] 到场相关唯一索引创建失败: ${err.message}`);
  }

  try {
    // 同一用户同一活动至多一条有效报名（部分唯一索引 + 冗余镜像列）
    await ensureSignupUniqueGuard(strapi);
  } catch (err: any) {
    strapi.log.warn(`[zhao-point] 报名唯一性兜底创建失败: ${err.message}`);
  }

  try {
    await ensureTicketTokenNotNull(strapi);
  } catch (err: any) {
    strapi.log.warn(`[zhao-point] 票据 token 收紧失败: ${err.message}`);
  }

  // 启动兜底：巡检并修复落后于 max(id) 的 ID 序列（防显式 id 插入导致的主键冲突复发）
  try {
    await healIdSequences(strapi);
  } catch (err: any) {
    strapi.log.warn(`[zhao-point] ID 序列自愈巡检失败: ${err.message}`);
  }

  try {
    // Strapi 5 plugins loader 会把 plugin.config 覆写为「已解包」的 default 导出
    // （@strapi/core loaders/plugins applyUserConfig），config("default") 恒为 undefined，
    // 必须直接读顶层键。
    const increaseRules = strapi.plugin("zhao-point").config("increaseRules") as Record<string, any> | undefined;
    const decreaseRules = strapi.plugin("zhao-point").config("decreaseRules") as Record<string, any> | undefined;
    if (!increaseRules && !decreaseRules) {
      strapi.log.warn("[zhao-point] 未读到积分规则配置(increaseRules/decreaseRules 均空)，跳过种子");
    } else {
      const existingRules = await strapi.db.query(RULE_UID).findMany({ select: ["action"] });
      const missing = collectMissingRules(increaseRules, decreaseRules, existingRules.map((r: any) => r.action));
      for (const { action, category, rule } of missing) {
        await strapi.db.query(RULE_UID).create({
          data: {
            action,
            category,
            points: rule.points || 0,
            enabled: true,
            limitPerDay: rule.limitPerDay ?? 0,
            limitPerUser: rule.limitPerUser ?? 0,
            limitPerDayPerUser: rule.limitPerDayPerUser ?? 0,
            isOneTime: rule.isOneTime ?? false,
            description: rule.description || "",
            taskGroup: rule.taskGroup || "other",
            extraConfig: rule.extraConfig ? JSON.stringify(rule.extraConfig) : "{}",
          },
        });
      }
      if (missing.length > 0) {
        strapi.log.info(`[zhao-point] 已种子 ${missing.length} 条积分规则: ${missing.map((m) => m.action).join(",")}`);
      } else {
        strapi.log.info("[zhao-point] 积分规则已完整，无需种子");
      }
    }
  } catch (err: any) {
    strapi.log.warn(`[zhao-point] 种子数据失败: ${err.message}`);
  }
};

export default bootstrap;
