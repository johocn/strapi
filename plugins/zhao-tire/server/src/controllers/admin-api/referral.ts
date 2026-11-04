import { createError, sendError } from "../../utils/errors";

const RC_UID = "plugin::zhao-tire.tire-referral-code";
const SHARE_UID = "plugin::zhao-tire.tire-share-record";
const REWARD_UID = "plugin::zhao-tire.tire-referral-reward";

const SHARE_STATUSES = ["bound", "valid", "pending_review", "invalid", "rolled_back"];

const pageParams = (query: any) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  return { page, pageSize };
};

const buildShareWhere = (query: any) => {
  const where: any = {};
  if (query.status && SHARE_STATUSES.includes(String(query.status))) {
    where.status = String(query.status);
  }
  if (query.referrerPhone) {
    where.referrerPhone = { $like: `%${String(query.referrerPhone).trim()}%` };
  }
  if (query.inviteePhone) {
    where.inviteePhone = { $like: `%${String(query.inviteePhone).trim()}%` };
  }
  if (query.orderNo) {
    where.orderNo = { $like: `%${String(query.orderNo).trim()}%` };
  }
  const from = String(query.from || "").trim();
  const to = String(query.to || "").trim();
  if (from || to) {
    where.boundAt = {};
    if (from) where.boundAt.$gte = `${from}T00:00:00.000Z`;
    if (to) where.boundAt.$lte = `${to}T23:59:59.999Z`;
  }
  return where;
};

const rewardSummary = async (phones: string[]) => {
  const unique = Array.from(new Set(phones.filter(Boolean)));
  if (unique.length === 0) return new Map<string, any>();
  const rows = await strapi.db.query(REWARD_UID).findMany({
    where: { phone: { $in: unique } },
    orderBy: { id: "DESC" },
  });
  const map = new Map<string, any>();
  for (const phone of unique) {
    const list = (rows || []).filter((row: any) => row.phone === phone);
    const latest = list[0];
    map.set(phone, {
      issued: list.length,
      available: list.filter((row: any) => row.status === "available").length,
      used: list.filter((row: any) => row.status === "used").length,
      latestStatus: latest ? latest.status : null,
      latestRewardNo: latest ? latest.rewardNo : null,
    });
  }
  return map;
};

const csvCell = (value: unknown) => {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
};


const readBody = (ctx: any): any => {
  const body = ctx.request?.body;
  if (!body || typeof body !== "object") return {};
  return body.data && typeof body.data === "object" ? body.data : body;
};

const requireId = (value: unknown): number => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw createError("VALIDATION_FAILED", 400, "邀请码 id 不合法");
  }
  return id;
};

export default {
  /** 列表查询：GET /admin/referral-codes?code=&phone=&page=&pageSize= */
  async find(ctx: any) {
    try {
      const query = ctx.query || {};
      const page = Math.max(1, Number(query.page) || 1);
      const pageSize = Math.min(
        100,
        Math.max(1, Number(query.pageSize) || 20)
      );

      const where: any = {};
      if (query.code) {
        where.code = { $like: `%${String(query.code).toUpperCase()}%` };
      }
      if (query.phone) {
        where.phone = { $like: `%${String(query.phone).trim()}%` };
      }

      const [data, total] = await Promise.all([
        strapi.db.query(RC_UID).findMany({
          where,
          orderBy: { id: "DESC" },
          limit: pageSize,
          offset: (page - 1) * pageSize,
        }),
        strapi.db.query(RC_UID).count({ where }),
      ]);

      ctx.body = {
        data,
        pagination: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      sendError(ctx, error);
    }
  },

  /** 更新基础信息：PATCH /admin/referral-codes/:id */
  async update(ctx: any) {
    try {
      const id = requireId(ctx.params.id);
      const body = readBody(ctx);
      const allowed = ["nickname"];
      const data: any = {};
      for (const key of allowed) {
        if (body[key] !== undefined) data[key] = body[key];
      }
      if (Object.keys(data).length === 0) {
        throw createError("VALIDATION_FAILED", 400, "没有可更新的字段");
      }
      const updated = await strapi.db.query(RC_UID).update({
        where: { id },
        data,
      });
      if (!updated) throw createError("REFERRAL_NOT_FOUND", 404, "邀请码不存在");
      ctx.body = { data: updated };
    } catch (error) {
      sendError(ctx, error);
    }
  },

  /** 手动发放免单次数：POST /admin/referral-codes/:id/grant-free */
  async grantFree(ctx: any) {
    try {
      const id = requireId(ctx.params.id);
      const body = readBody(ctx);
      const count = Math.max(1, Math.min(100, Number(body.count) || 1));

      const row = await strapi.db.query(RC_UID).findOne({ where: { id } });
      if (!row) throw createError("REFERRAL_NOT_FOUND", 404, "邀请码不存在");

      const pending = (Number(row.pendingFreeCount) || 0) + count;
      const total = (Number(row.totalFreeCount) || 0) + count;

      const updated = await strapi.db.query(RC_UID).update({
        where: { id },
        data: { pendingFreeCount: pending, totalFreeCount: total },
      });

      // 同时落一张奖励券，保证 C 端可以用券抵扣
      const referralService: any = strapi
        .plugin("zhao-tire")
        .service("referral");
      const issued = await referralService.issueReward(updated, {
        source: "manual",
        note: `后台手动发放（操作人 ${ctx.state?.user?.username || "admin"}）`,
        force: true,
      });

      ctx.body = {
        data: updated,
        granted: count,
        rewardNo: issued?.reward?.rewardNo || null,
        message: `已为 ${row.nickname || row.phone} 发放 ${count} 次免单额度`,
      };
    } catch (error) {
      sendError(ctx, error);
    }
  },

  /** 邀请记录明细：直接查 tire-share-record，服务端分页与筛选 */
  async shareRecords(ctx: any) {
    try {
      const query = ctx.query || {};
      const { page, pageSize } = pageParams(query);
      const where = buildShareWhere(query);
      const [rows, total] = await Promise.all([
        strapi.db.query(SHARE_UID).findMany({
          where,
          orderBy: { id: "DESC" },
          limit: pageSize,
          offset: (page - 1) * pageSize,
        }),
        strapi.db.query(SHARE_UID).count({ where }),
      ]);
      const summary = await rewardSummary(
        (rows || []).map((row: any) => row.referrerPhone)
      );
      ctx.body = {
        data: (rows || []).map((row: any) => ({
          ...row,
          reward: summary.get(row.referrerPhone) || {
            issued: 0,
            available: 0,
            used: 0,
            latestStatus: null,
            latestRewardNo: null,
          },
        })),
        pagination: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      sendError(ctx, error);
    }
  },

  /** 邀请记录导出 CSV（服务端筛选，最多 5000 行） */
  async exportShareRecords(ctx: any) {
    try {
      const query = ctx.query || {};
      const where = buildShareWhere(query);
      const rows = await strapi.db.query(SHARE_UID).findMany({
        where,
        orderBy: { id: "DESC" },
        limit: 5000,
      });
      const summary = await rewardSummary(
        (rows || []).map((row: any) => row.referrerPhone)
      );

      const header = [
        "分享人",
        "被邀请人",
        "邀请码",
        "订单号",
        "绑定时间",
        "是否入库生效",
        "状态",
        "奖励发放",
        "奖励可用",
        "奖励已用",
        "最近奖励单号",
        "风险原因",
      ];
      const lines = [header.map(csvCell).join(",")];
      for (const row of rows || []) {
        const reward = summary.get(row.referrerPhone) || {};
        lines.push(
          [
            row.referrerPhone,
            row.inviteePhone || "",
            row.shareCode,
            row.orderNo || "",
            row.boundAt || "",
            row.status === "valid" ? "是" : "否",
            row.status,
            reward.issued || 0,
            reward.available || 0,
            reward.used || 0,
            reward.latestRewardNo || "",
            row.riskReason || "",
          ]
            .map(csvCell)
            .join(",")
        );
      }

      const filename = `tire-share-records-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      ctx.set("Content-Type", "text/csv; charset=utf-8");
      ctx.set(
        "Content-Disposition",
        `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(
          filename
        )}`
      );
      ctx.body = `\ufeff${lines.join("\r\n")}`;
    } catch (error) {
      sendError(ctx, error);
    }
  },

  /** 奖励券台账（tire-referral-reward 直查） */
  async rewards(ctx: any) {
    try {
      const query = ctx.query || {};
      const { page, pageSize } = pageParams(query);
      const where: any = {};
      if (query.phone) where.phone = { $like: `%${String(query.phone).trim()}%` };
      if (query.status) where.status = String(query.status);
      if (query.rewardNo) where.rewardNo = String(query.rewardNo).trim();
      const [rows, total] = await Promise.all([
        strapi.db.query(REWARD_UID).findMany({
          where,
          orderBy: { id: "DESC" },
          limit: pageSize,
          offset: (page - 1) * pageSize,
        }),
        strapi.db.query(REWARD_UID).count({ where }),
      ]);
      ctx.body = {
        data: rows,
        pagination: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      sendError(ctx, error);
    }
  },
};
