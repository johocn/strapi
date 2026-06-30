import type { Core } from "@strapi/strapi";
import crypto from "crypto";

const VERIFICATION_UID = "plugin::zhao-point.channel-verification";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const throwError = (code: string, message: string, details?: any) => {
    const err = new Error(message) as any;
    err.code = code;
    err.details = details;
    throw err;
  };

  // ===== QR码生成 =====

  const generateQRCode = async (params: {
    verifierId: string | number;
    channelId: string | number;
    direction: "superior_to_subordinate" | "subordinate_to_superior";
  }) => {
    const { verifierId, channelId, direction } = params;

    // 生成一次性 token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟过期

    // 创建待核销记录
    const verification = await strapi.db.query(VERIFICATION_UID).create({
      data: {
        verifier: verifierId,
        channel: channelId,
        direction,
        method: "qr_scan",
        status: "pending",
        qrCodeToken: token,
        qrCodeExpiresAt: expiresAt.toISOString(),
        createdAt: new Date(),
      },
    });

    return {
      token,
      qrCodeData: JSON.stringify({
        type: "point-verify",
        token,
        channelId,
        expiresAt: expiresAt.toISOString(),
      }),
      expiresAt: expiresAt.toISOString(),
      verificationId: verification.id,
    };
  };

  // ===== 扫码核销 =====

  const verifyByQRCode = async (params: {
    token: string;
    verifiedUserId: string | number;
    verifierId?: string | number;
    location?: { lat: number; lng: number };
  }) => {
    const { token, verifiedUserId, verifierId, location } = params;

    const pending = await strapi.db.query(VERIFICATION_UID).findOne({
      where: { qrCodeToken: token, status: "pending" },
    });

    if (!pending) {
      throwError("POINT_017", "核销码无效或已过期");
    }

    // 检查过期
    if (pending.qrCodeExpiresAt && new Date(pending.qrCodeExpiresAt) < new Date()) {
      await strapi.db.query(VERIFICATION_UID).update({
        where: { id: pending.id },
        data: { status: "rejected", remark: "核销码已过期" },
      });
      throwError("POINT_017", "核销码已过期");
    }

    // 核销人与生成人不一致时使用传入的核销人
    const actualVerifier = verifierId || pending.verifier;

    // 验证渠道层级关系
    const hierarchyCheck = await verifyChannelHierarchy({
      verifierId: actualVerifier,
      verifiedUserId,
      channelId: pending.channel,
    });

    if (!hierarchyCheck.valid) {
      throwError("POINT_018", "渠道层级关系校验失败", hierarchyCheck);
    }

    // 更新核销记录
    const now = new Date().toISOString();
    const updated = await strapi.db.query(VERIFICATION_UID).update({
      where: { id: pending.id },
      data: {
        status: "approved",
        verifiedUser: verifiedUserId,
        verifier: actualVerifier,
        location: location || undefined,
        verifiedAt: now,
      },
    });

    // 可选：发放核销奖励积分
    try {
      const pointService = strapi.plugin("zhao-point").service("point");
      await pointService.earnPoints({
        userId: verifiedUserId,
        action: "qr_scan_verify",
        source: "channel_verification",
        method: "扫码核销奖励",
        channelId: pending.channel,
      });
    } catch {
      // 奖励发放失败不影响核销
    }

    return updated;
  };

  // ===== 手动核销 =====

  const manualVerify = async (params: {
    verifierId: string | number;
    verifiedUserId: string | number;
    channelId: string | number;
    direction: "superior_to_subordinate" | "subordinate_to_superior";
    remark?: string;
  }) => {
    const { verifierId, verifiedUserId, channelId, direction, remark } = params;

    const hierarchyCheck = await verifyChannelHierarchy({
      verifierId,
      verifiedUserId,
      channelId,
    });

    if (!hierarchyCheck.valid) {
      throwError("POINT_018", "渠道层级关系校验失败", hierarchyCheck);
    }

    const now = new Date().toISOString();
    const verification = await strapi.db.query(VERIFICATION_UID).create({
      data: {
        verifier: verifierId,
        verifiedUser: verifiedUserId,
        channel: channelId,
        direction,
        method: "manual",
        status: "approved",
        remark: remark || "",
        verifiedAt: now,
        createdAt: now,
      },
    });

    return verification;
  };

  // ===== 渠道层级验证 =====

  const verifyChannelHierarchy = async (params: {
    verifierId: string | number;
    verifiedUserId: string | number;
    channelId: string | number;
  }) => {
    try {
      const channelService = strapi.plugin("zhao-channel").service("channel");
      if (channelService) {
        const result = await channelService.verifyHierarchy({
          userId1: params.verifierId,
          userId2: params.verifiedUserId,
          channelId: params.channelId,
        });
        return result;
      }
    } catch {
      // zhao-channel not available, fallback to simple check
    }

    return { valid: true, relationship: "unknown", path: [] };
  };

  // ===== 审计日志 =====

  const getVerificationLog = async (filters?: {
    verifierId?: string | number;
    verifiedUserId?: string | number;
    channelId?: string | number;
    direction?: string;
    status?: string;
    method?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
    extraWhere?: Record<string, any>;
  }) => {
    const {
      verifierId, verifiedUserId, channelId, direction,
      status, method, startDate, endDate,
      page = 1, pageSize = 20,
      extraWhere,
    } = filters || {};

    const where: any = {};
    if (verifierId) where.verifier = verifierId;
    if (verifiedUserId) where.verifiedUser = verifiedUserId;
    if (channelId) where.channel = channelId;
    if (direction) where.direction = direction;
    if (status) where.status = status;
    if (method) where.method = method;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.$gte = startDate;
      if (endDate) where.createdAt.$lte = endDate;
    }
    if (extraWhere && typeof extraWhere === "object" && !Array.isArray(extraWhere)) {
      Object.assign(where, extraWhere);
    }

    const [records, total] = await Promise.all([
      strapi.db.query(VERIFICATION_UID).findMany({
        where,
        orderBy: { createdAt: "desc" },
        offset: (page - 1) * pageSize,
        limit: pageSize,
      }),
      strapi.db.query(VERIFICATION_UID).count({ where }),
    ]);

    return { records, total, page, pageSize };
  };

  const getVerificationStats = async (channelId?: string | number) => {
    const baseWhere: any = {};
    if (channelId) baseWhere.channel = channelId;

    const allRecords = await strapi.db.query(VERIFICATION_UID).findMany({
      where: baseWhere,
    });

    const stats = {
      totalVerifications: allRecords.length,
      approved: 0,
      rejected: 0,
      pending: 0,
      byDirection: {
        superiorToSubordinate: 0,
        subordinateToSuperior: 0,
      },
    };

    allRecords.forEach((r: any) => {
      if (r.status === "approved") stats.approved++;
      else if (r.status === "rejected") stats.rejected++;
      else if (r.status === "pending") stats.pending++;
      if (r.direction === "superior_to_subordinate") stats.byDirection.superiorToSubordinate++;
      else stats.byDirection.subordinateToSuperior++;
    });

    return stats;
  };

  return {
    generateQRCode,
    verifyByQRCode,
    manualVerify,
    verifyChannelHierarchy,
    getVerificationLog,
    getVerificationStats,
  };
};
