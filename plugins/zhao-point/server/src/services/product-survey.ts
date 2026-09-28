import type { Core } from "@strapi/strapi";

const VOTE_UID = "plugin::zhao-point.product-survey-vote";
const DEMAND_UID = "plugin::zhao-point.product-survey-demand";
const ACTIVITY_UID = "plugin::zhao-point.activity";

/** 周期键格式：YYYY-Www（如 2026-W40） */
const ROUND_KEY_RE = /^\d{4}-W\d{2}$/;

/** 构造带 HTTP 状态的业务错误（控制器按 status 透出 { error }） */
function httpError(status: number, message: string): any {
  const e: any = new Error(message);
  e.status = status;
  return e;
}

/**
 * 从 source（活动 documentId）解析选品模块的截止时间。
 * promoModules 为 json 数组，每项 { type, config, sort }；取 type === 'survey' 的 config.deadline（ISO 字符串）。
 * 读不到合法 deadline（无 source / 无 survey 模块 / deadline 非法）时返回 null，表示不校验截止时间。
 */
async function resolveDeadline(strapi: Core.Strapi, source?: string | null): Promise<number | null> {
  if (!source) return null;
  const act: any = await strapi.db.query(ACTIVITY_UID).findOne({
    where: { documentId: String(source) },
    select: ["id", "promoModules"],
  });
  if (!act) return null;
  let modules = act.promoModules;
  if (typeof modules === "string") {
    try {
      modules = JSON.parse(modules);
    } catch {
      modules = null;
    }
  }
  if (!Array.isArray(modules)) return null;
  const survey = modules.find((m: any) => m && m.type === "survey");
  const dl = survey?.config?.deadline;
  if (typeof dl !== "string" || !dl.trim()) return null;
  const ts = Date.parse(dl);
  return Number.isNaN(ts) ? null : ts;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /** roundKey 格式校验：不符合 ^\d{4}-W\d{2}$ 抛 400 */
  assertRoundKey(roundKey: any): string {
    if (typeof roundKey !== "string" || !ROUND_KEY_RE.test(roundKey)) {
      throw httpError(400, "roundKey 格式应为 YYYY-Www（如 2026-W40）");
    }
    return roundKey;
  },

  /**
   * 归一化并校验 votes：非法项整体 400（附明确文案）；同 productId 重复提交保留首项。
   * 返回 [{ productId, productName, variantIds, collectionLabel }]
   */
  normalizeVotes(votes: any): Array<{ productId: string; productName: string | null; variantIds: string[] | null; collectionLabel: string | null }> {
    if (!Array.isArray(votes)) throw httpError(400, "votes 必须为数组");
    const out: Array<{ productId: string; productName: string | null; variantIds: string[] | null; collectionLabel: string | null }> = [];
    const seen = new Set<string>();
    for (const item of votes) {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw httpError(400, "votes 每项必须为对象");
      const productId = item.productId;
      if (typeof productId !== "string" || !productId.trim()) throw httpError(400, "votes 每项 productId 必填且为字符串");
      if (item.variantIds != null && !(Array.isArray(item.variantIds) && item.variantIds.every((v: any) => typeof v === "string"))) {
        throw httpError(400, "votes 每项 variantIds 必须为字符串数组");
      }
      if (item.productName != null && typeof item.productName !== "string") throw httpError(400, "votes 每项 productName 必须为字符串");
      if (item.collectionLabel != null && typeof item.collectionLabel !== "string") throw httpError(400, "votes 每项 collectionLabel 必须为字符串");
      if (seen.has(productId)) continue;
      seen.add(productId);
      out.push({
        productId,
        productName: item.productName ?? null,
        variantIds: item.variantIds ?? null,
        collectionLabel: item.collectionLabel ?? null,
      });
    }
    return out;
  },

  /** 回显用户「本渠道 + 本周期」已勾选与自由输入，供 C 端进页面预勾选 */
  async getMyVote({ channel, roundKey, userId }: { channel: string; roundKey: string; userId: number }) {
    const rows = await strapi.db.query(VOTE_UID).findMany({
      where: { channel, roundKey, userId },
      orderBy: { id: "asc" },
    });
    const demands = await strapi.db.query(DEMAND_UID).findMany({
      where: { channel, roundKey, userId },
      orderBy: { id: "asc" },
    });
    return {
      channel,
      roundKey,
      votes: rows.map((r: any) => ({
        productId: r.productId,
        productName: r.productName ?? null,
        variantIds: Array.isArray(r.variantIds) ? r.variantIds : [],
        collectionLabel: r.collectionLabel ?? null,
      })),
      freeInput: demands[0]?.text ?? "",
    };
  },

  /**
   * 快照式覆盖提交：事务内 upsert 列表内商品、删除本渠道+本周期+本用户不在列表中的旧票；
   * freeInput 为空删除需求行，非空 upsert。返回提交后的回显。
   */
  async submit({ channel, roundKey, userId, source, votes, freeInput }: {
    channel: string;
    roundKey: string;
    userId: number;
    source?: string | null;
    votes: any;
    freeInput?: any;
  }) {
    this.assertRoundKey(roundKey);
    const normalized = this.normalizeVotes(votes);
    if (freeInput != null && typeof freeInput !== "string") throw httpError(400, "freeInput 必须为字符串");

    const deadline = await resolveDeadline(strapi, source);
    if (deadline != null && Date.now() > deadline) throw httpError(403, "本期已截止");

    const src = source ?? null;
    const text = typeof freeInput === "string" ? freeInput.trim() : "";

    // Strapi5 事务 AsyncLocalStorage：事务内 strapi.db.query 自动绑定同一 trx
    await strapi.db.transaction(async () => {
      const existing: any[] = await strapi.db.query(VOTE_UID).findMany({
        where: { channel, roundKey, userId },
      });
      const byProduct = new Map(existing.map((r: any) => [r.productId, r]));
      const keep = new Set(normalized.map((v) => v.productId));

      for (const v of normalized) {
        const data = {
          productName: v.productName,
          variantIds: v.variantIds,
          collectionLabel: v.collectionLabel,
          source: src,
        };
        const prev = byProduct.get(v.productId);
        if (prev) {
          await strapi.db.query(VOTE_UID).update({ where: { id: prev.id }, data });
        } else {
          await strapi.db.query(VOTE_UID).create({
            data: { channel, roundKey, user: userId, userId, productId: v.productId, ...data },
          });
        }
      }

      const staleIds = existing.filter((r: any) => !keep.has(r.productId)).map((r: any) => r.id);
      if (staleIds.length) {
        await strapi.db.query(VOTE_UID).deleteMany({ where: { id: { $in: staleIds } } });
      }

      const demands: any[] = await strapi.db.query(DEMAND_UID).findMany({
        where: { channel, roundKey, userId },
        orderBy: { id: "asc" },
      });
      if (!text) {
        if (demands.length) {
          await strapi.db.query(DEMAND_UID).deleteMany({ where: { id: { $in: demands.map((d: any) => d.id) } } });
        }
      } else if (demands.length) {
        await strapi.db.query(DEMAND_UID).update({ where: { id: demands[0].id }, data: { text, source: src } });
        const extraIds = demands.slice(1).map((d: any) => d.id);
        if (extraIds.length) {
          await strapi.db.query(DEMAND_UID).deleteMany({ where: { id: { $in: extraIds } } });
        }
      } else {
        await strapi.db.query(DEMAND_UID).create({
          data: { channel, roundKey, user: userId, userId, text, source: src },
        });
      }
    });

    return this.getMyVote({ channel, roundKey, userId });
  },

  /**
   * 榜单聚合（纯查询不落库）。
   * channelIds 为 scope 收窄后的渠道 string 列表（null 表示不按 scope 收窄）；channel 显式指定时优先。
   */
  async getBoard({ channel, roundKey, source, channelIds }: {
    channel?: string;
    roundKey: string;
    source?: string;
    channelIds?: string[] | null;
  }) {
    const where: any = { roundKey };
    if (source) where.source = source;
    if (channel) where.channel = channel;
    else if (Array.isArray(channelIds)) where.channel = { $in: channelIds };

    const votes: any[] = await strapi.db.query(VOTE_UID).findMany({ where, orderBy: { id: "asc" } });
    const demands: any[] = await strapi.db.query(DEMAND_UID).findMany({ where, orderBy: { id: "desc" } });

    const participants = new Set<number>();
    const byProduct = new Map<string, {
      productId: string;
      productName: string | null;
      collectionLabel: string | null;
      voters: Set<number>;
      variants: Map<string, number>;
    }>();

    for (const v of votes) {
      const uid = v.userId ?? v.user?.id ?? null;
      if (uid != null) participants.add(uid);
      let g = byProduct.get(v.productId);
      if (!g) {
        g = { productId: v.productId, productName: null, collectionLabel: null, voters: new Set(), variants: new Map() };
        byProduct.set(v.productId, g);
      }
      if (uid != null) g.voters.add(uid);
      if (!g.productName && v.productName) g.productName = v.productName;
      if (!g.collectionLabel && v.collectionLabel) g.collectionLabel = v.collectionLabel;
      if (Array.isArray(v.variantIds)) {
        for (const vid of v.variantIds) {
          const key = String(vid);
          g.variants.set(key, (g.variants.get(key) || 0) + 1);
        }
      }
    }

    const participantCount = participants.size;
    const rows = Array.from(byProduct.values())
      .map((g) => ({
        productId: g.productId,
        productName: g.productName,
        collectionLabel: g.collectionLabel,
        voterCount: g.voters.size,
        ratio: participantCount ? g.voters.size / participantCount : 0,
        variantBreakdown: Array.from(g.variants.entries())
          .map(([variantId, count]) => ({ variantId, count }))
          .sort((a, b) => b.count - a.count || a.variantId.localeCompare(b.variantId)),
      }))
      .sort((a, b) => b.voterCount - a.voterCount || a.productId.localeCompare(b.productId))
      .map((r, i) => ({ rank: i + 1, ...r }));

    return {
      summary: { participants: participantCount, votes: votes.length, products: byProduct.size },
      rows,
      // 仅透出脱敏标签，不泄露手机号/昵称等 PII
      demands: demands.map((d: any) => ({
        userLabel: `用户#${d.userId ?? "-"}`,
        text: d.text,
        createdAt: d.createdAt,
      })),
    };
  },
});