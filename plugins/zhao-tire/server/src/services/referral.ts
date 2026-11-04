import type { Core } from "@strapi/strapi";

const RC_UID = "plugin::zhao-tire.tire-referral-code";
const ORDER_UID = "plugin::zhao-tire.tire-order";
const SHARE_UID = "plugin::zhao-tire.tire-share-record";
const REWARD_UID = "plugin::zhao-tire.tire-referral-reward";
const PACKAGE_UID = "plugin::zhao-tire.tire-package";
const CONFIG_UID = "plugin::zhao-tire.tire-config";
const PHONE_PATTERN = /^1[3-9]\d{9}$/;

const INVITE_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const INVITE_CODE_LEN = 6;
const REFERRAL_THRESHOLD = 3;
const DEFAULT_REWARD_CAP = 6900;
const DEFAULT_REWARD_VALID_DAYS = 365;
const DEFAULT_REWARD_YEAR_LIMIT = 4;
const DEFAULT_DAILY_BIND_LIMIT = 5;

function throwErr(code: string, status: number, message: string): never {
  const e: any = new Error(message);
  e.code = code;
  e.status = status;
  throw e;
}

function generateCode(): string {
  let result = "";
  for (let i = 0; i < INVITE_CODE_LEN; i += 1) {
    result += INVITE_CODE_CHARS.charAt(
      Math.floor(Math.random() * INVITE_CODE_CHARS.length)
    );
  }
  return result;
}

function generateRewardNo(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `RW${stamp}${rand}`;
}

const toNumber = (value: unknown, fallback = 0): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

async function readConfig(strapi: Core.Strapi) {
  const config: any = (await strapi.db.query(CONFIG_UID).findOne()) || {};
  return {
    rewardCap: toNumber(config.referralRewardCap, DEFAULT_REWARD_CAP),
    rewardValidDays: toNumber(
      config.referralRewardValidDays,
      DEFAULT_REWARD_VALID_DAYS
    ),
    rewardYearLimit: toNumber(
      config.referralRewardYearLimit,
      DEFAULT_REWARD_YEAR_LIMIT
    ),
    dailyBindLimit: toNumber(
      config.referralDailyBindLimit,
      DEFAULT_DAILY_BIND_LIMIT
    ),
  };
}

/** 确保手机号拥有邀请码；没有则自动生成一个 */
async function ensureCode(strapi: Core.Strapi, phone: string, nickname?: string) {
  let row = await strapi.db.query(RC_UID).findOne({ where: { phone } });
  if (row) {
    if (nickname && nickname !== row.nickname) {
      row = await strapi.db.query(RC_UID).update({
        where: { id: row.id },
        data: { nickname },
      });
    }
    return row;
  }
  let created: any = null;
  let lastError: any = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCode();
    try {
      created = await strapi.db.query(RC_UID).create({
        data: { code, phone, nickname: nickname || null },
      });
      break;
    } catch (error: any) {
      lastError = error;
      if (String(error?.message || "").toLowerCase().includes("unique")) continue;
      throw error;
    }
  }
  if (!created) throw lastError || new Error("邀请码生成失败");
  return created;
}

/** 基础套餐价（用于奖励额度快照） */
async function basePackageFee(strapi: Core.Strapi): Promise<number> {
  const packages = await strapi.db.query(PACKAGE_UID).findMany({
    where: { enabled: true },
    orderBy: { sort: "ASC" },
  });
  for (const pkg of packages || []) {
    const price = toNumber(pkg.storePrice) || toNumber(pkg.pickupPrice);
    if (price > 0) return price;
  }
  return 0;
}

function dayStart(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /** 获取或创建某手机号的邀请码（返回邀请码 + 计数 + 奖励情况） */
  async ensureForPhone(phone: string, nickname?: string) {
    if (!PHONE_PATTERN.test(phone)) {
      throwErr("VALIDATION_FAILED", 400, "手机号不合法");
    }
    return ensureCode(strapi, phone, nickname);
  },

  /** 校验邀请码是否存在，返回码的归属手机号；不存在抛错 */
  async validate(referralCode: string) {
    const code = String(referralCode || "").trim().toUpperCase();
    if (!code) throwErr("VALIDATION_FAILED", 400, "邀请码不能为空");
    if (code.length !== INVITE_CODE_LEN) throwErr("VALIDATION_FAILED", 400, "邀请码格式错误");
    const row = await strapi.db.query(RC_UID).findOne({ where: { code } });
    if (!row) throwErr("REFERRAL_CODE_INVALID", 400, "邀请码不存在");
    return row;
  },

  /**
   * 下单后绑定邀请关系（订单创建成功后调用）
   * - 禁止自邀
   * - 同一手机号 / openid / 设备只能绑定一个邀请人
   * - 单邀请人每日绑定上限，超限进 pending_review
   * - 被邀请人仅首单可绑定
   */
  async attachReferral(
    order: any,
    referralCode: string,
    extra: { openid?: string; deviceId?: string; ip?: string } = {}
  ) {
    if (!order?.id) return null;
    const phone = String(order.phone || "");
    const code = String(referralCode || "").trim().toUpperCase();
    if (!code) return null;

    const rc = await this.validate(code);
    if (rc.phone === phone) {
      throwErr("REFERRAL_SELF", 400, "不能使用自己的邀请码");
    }

    const openid = String(extra.openid || "").trim().slice(0, 128);
    const deviceId = String(extra.deviceId || "").trim().slice(0, 128);
    const ip = String(extra.ip || "").trim().slice(0, 64);

    // 只允许被邀请人的首单绑定邀请关系
    const previous = await strapi.db.query(ORDER_UID).count({
      where: {
        phone,
        id: { $ne: order.id },
      },
    });
    if (previous > 0) {
      strapi.log.warn(
        `[zhao-tire] referral skipped: phone ${phone} already has ${previous} order(s)`
      );
      return { skipped: true, reason: "not_first_order" };
    }

    const dedupeKey = openid
      ? `openid:${openid}`
      : deviceId
        ? `device:${deviceId}`
        : `phone:${phone}`;

    const exists = await strapi.db.query(SHARE_UID).findOne({ where: { dedupeKey } });
    if (exists) {
      return { skipped: true, reason: "already_bound", record: exists };
    }

    // 同手机号已被其他邀请人绑定
    const samePhone = await strapi.db.query(SHARE_UID).findOne({
      where: { inviteePhone: phone },
    });
    if (samePhone && samePhone.referrerPhone !== rc.phone) {
      return { skipped: true, reason: "invitee_bound_to_other" };
    }

    const boundAt = new Date();
    const sameDayCount = await strapi.db.query(SHARE_UID).count({
      where: {
        referrerPhone: rc.phone,
        boundAt: { $gte: dayStart(boundAt).toISOString() },
        status: { $in: ["bound", "valid"] },
      },
    });

    let status = "bound";
    let riskReason: string | null = null;
    if (sameDayCount >= (await readConfig(strapi)).dailyBindLimit) {
      status = "pending_review";
      riskReason = "daily_bind_limit";
    }

    const record = await strapi.db.query(SHARE_UID).create({
      data: {
        shareCode: rc.code,
        referrerPhone: rc.phone,
        inviteePhone: phone,
        inviteeOpenid: openid || null,
        deviceId: deviceId || null,
        ip: ip || null,
        orderNo: order.orderNo,
        orderId: order.id,
        status,
        riskReason,
        dedupeKey,
        boundAt: boundAt.toISOString(),
      },
    });

    await strapi.db.query(ORDER_UID).update({
      where: { id: order.id },
      data: { referralCode: rc.code, referrerPhone: rc.phone },
    });

    if (status === "bound") {
      await strapi.db.query(RC_UID).update({
        where: { id: rc.id },
        data: { usedCount: toNumber(rc.usedCount) + 1 },
      });
    }

    return record;
  },

  /** 被邀请人入库成功：把邀请置为有效并触发「每满 3 人发 1 次」 */
  async markValidOnInbound(orderNo: string) {
    const order = await strapi.db.query(ORDER_UID).findOne({ where: { orderNo } });
    if (!order) return null;

    let record: any = await strapi.db.query(SHARE_UID).findOne({
      where: { orderNo },
      orderBy: { id: "DESC" },
    });
    if (!record && order.phone) {
      record = await strapi.db.query(SHARE_UID).findOne({
        where: { inviteePhone: order.phone, status: "bound" },
        orderBy: { id: "DESC" },
      });
    }
    if (!record) return null;
    if (record.status === "valid") return { duplicated: true, record };
    if (record.status !== "bound") {
      return { skipped: true, reason: record.status, record };
    }

    const now = new Date().toISOString();
    await strapi.db.query(SHARE_UID).update({
      where: { id: record.id },
      data: { status: "valid", validAt: now },
    });

    let rc: any = await strapi.db.query(RC_UID).findOne({
      where: { phone: record.referrerPhone },
    });
    if (!rc) rc = await ensureCode(strapi, record.referrerPhone);

    const completed = toNumber(rc.completedCount) + 1;
    let pendingFree = toNumber(rc.pendingFreeCount);
    let totalFree = toNumber(rc.totalFreeCount);
    const rewarded = completed >= REFERRAL_THRESHOLD && completed % REFERRAL_THRESHOLD === 0;
    let reward: any = null;

    if (rewarded) {
      reward = await this.issueReward(rc, { source: "referral_3" });
      if (reward?.issued) {
        pendingFree += 1;
        totalFree += 1;
      }
    }

    const debtCount = toNumber(rc.debtCount) + (reward?.debt ? 1 : 0);
    await strapi.db.query(RC_UID).update({
      where: { id: rc.id },
      data: { completedCount: completed, pendingFreeCount: pendingFree, totalFreeCount: totalFree, debtCount },
    });

    return {
      referralCode: rc.code,
      referrerPhone: rc.phone,
      completedCount: completed,
      rewarded,
      reward,
      pendingFreeCount: pendingFree,
      recordId: record.id,
    };
  },

  /**
   * 发放一次免单额度（基础套餐费，受单次封顶 / 年度上限约束）
   * - 额度快照 = min(基础套餐价, referralRewardCap)
   * - cap = 0 时表示不封顶
   * - debtCount > 0 时先抵消欠账，不发新券
   */
  async issueReward(
    rc: any,
    options: { source?: string; note?: string; force?: boolean } = {}
  ) {
    const config = await readConfig(strapi);
    const phone = String(rc.phone || "");
    if (!options.force && toNumber(rc.debtCount) > 0) {
      return { issued: false, debt: true, reason: "debt_offset" };
    }

    if (!options.force) {
      const yearStart = new Date(new Date().getFullYear(), 0, 1);
      const yearCount = await strapi.db.query(REWARD_UID).count({
        where: {
          phone,
          source: "referral_3",
          issuedAt: { $gte: yearStart.toISOString() },
        },
      });
      if (yearCount >= config.rewardYearLimit) {
        return { issued: false, reason: "year_limit" };
      }
    }

    const baseFee = await basePackageFee(strapi);
    const cap = config.rewardCap;
    const amount = cap > 0 ? Math.min(baseFee || cap, cap) : baseFee;
    const issuedAt = new Date();
    const expiresAt = new Date(
      issuedAt.getTime() + Math.max(1, config.rewardValidDays) * 86400000
    );

    const reward = await strapi.db.query(REWARD_UID).create({
      data: {
        rewardNo: generateRewardNo(),
        phone,
        amount,
        source: options.source || "referral_3",
        status: "available",
        issuedAt: issuedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        note: options.note || "每满 3 个有效邀请赠送 1 次基础套餐免单",
      },
    });
    return { issued: true, reward, amount };
  },

  /**
   * 下单时预占一张奖励券（避免并发重复使用）
   * 返回 { rewardNo, discount, amount }；无可用券返回 null
   */
  async reserveReward(phone: string, amountPackage: number) {
    const now = new Date();
    const rows = await strapi.db.query(REWARD_UID).findMany({
      where: {
        phone,
        status: "available",
        $or: [{ expiresAt: null }, { expiresAt: { $gt: now.toISOString() } }],
      },
      orderBy: { expiresAt: "ASC" },
      limit: 5,
    });

    for (const row of rows || []) {
      const claimed = await strapi.db.query(REWARD_UID).update({
        where: { id: row.id, status: "available" },
        data: { status: "reserved", usedAt: now.toISOString() },
      });
      if (!claimed) continue;
      const amount = toNumber(row.amount);
      const discount = amount > 0 ? Math.min(amount, amountPackage) : amountPackage;
      return { rewardNo: row.rewardNo, discount, amount, reward: claimed };
    }
    return null;
  },

  /** 订单创建成功后把预占券绑定到订单 */
  async bindReward(rewardNo: string, orderNo: string) {
    if (!rewardNo) return null;
    return strapi.db.query(REWARD_UID).update({
      where: { rewardNo, status: "reserved" },
      data: { status: "used", usedOrderNo: orderNo, usedAt: new Date().toISOString() },
    });
  },

  /** 订单创建失败时释放预占券 */
  async releaseReward(rewardNo: string) {
    if (!rewardNo) return null;
    return strapi.db.query(REWARD_UID).update({
      where: { rewardNo, status: "reserved" },
      data: { status: "available", usedOrderNo: null, usedAt: null },
    });
  },

  /** 查询某手机号的可用奖励券（前端展示） */
  async listRewards(phone: string) {
    if (!PHONE_PATTERN.test(phone)) {
      throwErr("VALIDATION_FAILED", 400, "手机号不合法");
    }
    const now = new Date();
    const rows = await strapi.db.query(REWARD_UID).findMany({
      where: { phone },
      orderBy: { expiresAt: "ASC" },
      limit: 50,
    });
    const rewards = (rows || []).map((row: any) => {
      const expired =
        row.status === "available" &&
        row.expiresAt &&
        new Date(row.expiresAt).getTime() <= now.getTime();
      return {
        rewardNo: row.rewardNo,
        amount: toNumber(row.amount),
        source: row.source,
        status: expired ? "expired" : row.status,
        issuedAt: row.issuedAt,
        expiresAt: row.expiresAt,
        usedOrderNo: row.usedOrderNo || null,
      };
    });
    return {
      rewards,
      available: rewards.filter((item: any) => item.status === "available"),
    };
  },

  /** 退款回滚：作废该订单产生的有效邀请与未使用奖励 */
  async rollbackForOrder(orderNo: string) {
    const record: any = await strapi.db.query(SHARE_UID).findOne({
      where: { orderNo, status: "valid" },
      orderBy: { id: "DESC" },
    });
    if (!record) return null;

    await strapi.db.query(SHARE_UID).update({
      where: { id: record.id },
      data: { status: "rolled_back", riskReason: "order_refunded" },
    });

    const rc: any = await strapi.db.query(RC_UID).findOne({
      where: { phone: record.referrerPhone },
    });
    if (!rc) return { rolledBack: true };

    const completed = Math.max(0, toNumber(rc.completedCount) - 1);
    let pendingFree = Math.max(0, toNumber(rc.pendingFreeCount));
    let debtCount = toNumber(rc.debtCount);
    const milestoneBroken =
      toNumber(rc.completedCount) >= REFERRAL_THRESHOLD &&
      toNumber(rc.completedCount) % REFERRAL_THRESHOLD === 0;

    if (milestoneBroken) {
      // 优先作废最近一张未使用的券；已使用则记欠账
      const latest = await strapi.db.query(REWARD_UID).findOne({
        where: { phone: rc.phone, source: "referral_3", status: { $in: ["available", "reserved"] } },
        orderBy: { id: "DESC" },
      });
      if (latest) {
        await strapi.db.query(REWARD_UID).update({
          where: { id: latest.id, status: latest.status },
          data: { status: "void", note: "退款回滚作废" },
        });
        pendingFree = Math.max(0, pendingFree - 1);
      } else {
        debtCount += 1;
      }
    }

    await strapi.db.query(RC_UID).update({
      where: { id: rc.id },
      data: { completedCount: completed, pendingFreeCount: pendingFree, debtCount },
    });
    return { rolledBack: true, completedCount: completed, pendingFreeCount: pendingFree, debtCount };
  },

  /** 订单退款后归还该单使用的奖励券 */
  async restoreUsedReward(order: any) {
    if (!order?.rewardNo) return null;
    const reward: any = await strapi.db.query(REWARD_UID).findOne({
      where: { rewardNo: order.rewardNo, status: "used" },
    });
    if (!reward) return null;
    const rc: any = await strapi.db.query(RC_UID).findOne({
      where: { phone: String(order.phone || reward.phone) },
    });
    await strapi.db.query(REWARD_UID).update({
      where: { id: reward.id, status: "used" },
      data: { status: "available", usedOrderNo: null, usedAt: null, note: "订单退款返还" },
    });
    if (rc) {
      await strapi.db.query(RC_UID).update({
        where: { id: rc.id },
        data: { pendingFreeCount: toNumber(rc.pendingFreeCount) + 1 },
      });
    }
    return { rewardNo: reward.rewardNo };
  },

  /**
   * 兼容旧接口：支付完成时累加计数（新流程已改为入库触发）
   */
  async markCompleted(orderNo: string) {
    return this.markValidOnInbound(orderNo);
  },

  /** 兼容旧接口：扣减一次免单额度，返回是否成功 */
  async consumeFree(phone: string): Promise<boolean> {
    const reserved = await this.reserveReward(phone, 100000000);
    if (!reserved) return false;
    await strapi.db.query(REWARD_UID).update({
      where: { rewardNo: reserved.rewardNo, status: "reserved" },
      data: { status: "used", usedAt: new Date().toISOString() },
    });
    const rc: any = await strapi.db.query(RC_UID).findOne({ where: { phone } });
    if (rc) {
      await strapi.db.query(RC_UID).update({
        where: { id: rc.id },
        data: { pendingFreeCount: Math.max(0, toNumber(rc.pendingFreeCount) - 1) },
      });
    }
    return true;
  },

  /** 查询某手机号的邀请码详情 + 奖励进度（前端"我的邀请码"页用） */
  async getProfile(phone: string) {
    if (!PHONE_PATTERN.test(phone)) {
      throwErr("VALIDATION_FAILED", 400, "手机号不合法");
    }
    const rc = await strapi.db.query(RC_UID).findOne({ where: { phone } });
    if (!rc) {
      // 首次登录的账号还没生成邀请码，自动生成
      return ensureCode(strapi, phone);
    }
    return rc;
  },
});
