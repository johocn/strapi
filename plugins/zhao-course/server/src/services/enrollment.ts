import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-course.course-enrollment";
const COURSE_UID = "plugin::zhao-course.course";
const ACCESS_CODE_UID = "plugin::zhao-course.course-access-code";
const USER_AUTH_UID = "plugin::zhao-course.user-course-auth";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  /**
   * 消费开通码（事务性）
   * - 校验码有效 + 配额 + 过期
   * - usedCount++，达到上限则 status=disabled
   * - 记录 usedBy/usedAt
   */
  async function consumeAccessCode(userId: number, courseId: number, code: string) {
    const accessCode = await strapi.db.query(ACCESS_CODE_UID).findOne({
      where: { code, course: courseId },
    });
    if (!accessCode) {
      throwErr("COURSE_ENROLL_014", 404, "开通码无效");
    }
    if (accessCode.status !== "active") {
      throwErr("COURSE_ENROLL_015", 400, `开通码已${accessCode.status === "disabled" ? "禁用" : "过期"}`);
    }
    if (accessCode.expireAt && new Date(accessCode.expireAt) < new Date()) {
      await strapi.db.query(ACCESS_CODE_UID).update({
        where: { id: accessCode.id },
        data: { status: "expired" },
      });
      throwErr("COURSE_ENROLL_016", 400, "开通码已过期");
    }
    if (accessCode.totalQuota !== -1 && accessCode.usedCount >= accessCode.totalQuota) {
      throwErr("COURSE_ENROLL_017", 400, "开通码已用尽");
    }

    // 乐观锁：usedCount++，达到上限自动 disabled
    const newUsedCount = accessCode.usedCount + 1;
    const willDisabled = accessCode.totalQuota !== -1 && newUsedCount >= accessCode.totalQuota;
    await strapi.db.query(ACCESS_CODE_UID).update({
      where: { id: accessCode.id },
      data: {
        usedCount: newUsedCount,
        status: willDisabled ? "disabled" : "active",
        usedBy: userId,
        usedAt: new Date(),
      },
    });
  }

  /**
   * 同步开通学习权限（创建 user-course-auth 记录）
   */
  async function grantCourseAccess(userId: number, courseId: number, authType: string) {
    const existing = await strapi.db.query(USER_AUTH_UID).findOne({
      where: { user: userId, course: courseId },
    });
    if (existing) {
      // 已有记录：重新激活
      await strapi.db.query(USER_AUTH_UID).update({
        where: { id: existing.id },
        data: { isExpired: false, expiresAt: null, authType },
      });
    } else {
      await strapi.documents(USER_AUTH_UID).create({
        data: {
          user: userId,
          course: courseId,
          authType: authType === "free" ? "free" : "paid",
          isExpired: false,
        },
      });
    }

    // 获课成功埋点 → 课后SOP（课程购课/报名成功）
    try {
      const course = await strapi.db.query(COURSE_UID).findOne({
        where: { id: courseId },
        select: ["title"],
      });
      const sop = strapi.plugin("zhao-sso").service("sso-sop");
      const sso = await sop.resolveSsoUserForUpUser(userId); // 按标识匹配, 匹配不到返回 null
      if (sso) {
        await sop.trigger("course.enrolled", {
          user: sso.id,
          payload: { course: { title: course?.title || "" } },
          schedules: [
            { templateCode: "course_d7", scene: "course.d7", delayMinutes: 1 * 24 * 60 },
            { templateCode: "course_d7", scene: "course.d7", delayMinutes: 3 * 24 * 60 },
            { templateCode: "course_d7", scene: "course.d7", delayMinutes: 7 * 24 * 60 },
          ],
        });
      }
    } catch (err: any) {
      strapi.log.warn(`[course] course.enrolled 埋点失败: ${err?.message || err}`);
    }
  }

  return {
    async find(query: any = {}) {
      return strapi.documents(UID).findMany({
        ...query,
        populate: { user: true, course: true, reviewer: true },
      });
    },

    async findOne(documentId: string) {
      return strapi.documents(UID).findOne({
        documentId,
        populate: { user: true, course: true, reviewer: true },
      });
    },

    /**
     * 查询当前用户对某课程的报名记录（仅返回最新一条有效记录）
     */
    async findMyEnrollment(userId: number, courseDocumentId: string) {
      const course = await strapi.db.query(COURSE_UID).findOne({
        where: { document_id: courseDocumentId },
        select: ["id"],
      });
      if (!course) {
        throwErr("COURSE_ENROLL_001", 404, "课程不存在");
      }
      // 查询有效报名记录（排除 rejected/revoked）
      const records = await strapi.db.query(UID).findMany({
        where: {
          user: userId,
          course: course.id,
          status: { $in: ["enrolled", "pending_review"] },
        },
        populate: { course: true },
        orderBy: { createdAt: "desc" },
      });
      return records && records.length > 0 ? records[0] : null;
    },

    /**
     * 查询当前用户的所有报名记录
     */
    async findMyEnrollments(userId: number, filters: any = {}) {
      const where: any = { user: userId };
      if (filters.status) {
        where.status = filters.status;
      }
      return strapi.db.query(UID).findMany({
        where,
        populate: { course: true },
        orderBy: { createdAt: "desc" },
      });
    },

    /**
     * 创建报名记录
     * 业务流程：
     *   - free/points/code → status=enrolled（立即开通）
     *   - paid → status=pending_review（待审核）
     */
    async createEnrollment(userId: number, data: {
      courseDocumentId: string;
      enrollType: "free" | "points" | "paid" | "code";
      voucherUrl?: string;
      voucherNote?: string;
      accessCode?: string;
    }) {
      const { courseDocumentId, enrollType, voucherUrl, voucherNote, accessCode } = data;

      // 1. 查询课程
      const course = await strapi.db.query(COURSE_UID).findOne({
        where: { document_id: courseDocumentId },
      });
      if (!course) {
        throwErr("COURSE_ENROLL_001", 404, "课程不存在");
      }

      // 2. 唯一性校验：每用户每课程只能有一条有效 enrollment
      const existing = await strapi.db.query(UID).findOne({
        where: {
          user: userId,
          course: course.id,
          status: { $in: ["enrolled", "pending_review"] },
        },
      });
      if (existing) {
        throwErr("COURSE_ENROLL_002", 409, "您已报名此课程");
      }

      // 3. 报名模式校验
      const enrollMode = course.enrollMode || "none";
      if (enrollMode === "period") {
        const now = new Date();
        if (course.enrollStartDate && new Date(course.enrollStartDate) > now) {
          throwErr("COURSE_ENROLL_003", 400, "报名未开始");
        }
        if (course.enrollEndDate && new Date(course.enrollEndDate) < now) {
          throwErr("COURSE_ENROLL_004", 400, "报名已结束");
        }
      }

      const now = new Date();
      const baseData: any = {
        user: userId,
        course: course.id,
        enrollType,
        enrolledAt: now,
      };

      // 4. 按 enrollType 分流处理
      if (enrollType === "free") {
        // 免费课程立即开通
        baseData.status = "enrolled";
      } else if (enrollType === "points") {
        // 积分兑换：扣减积分
        const pointsPrice = Number(course.pointsPrice || 0);
        if (pointsPrice <= 0) {
          throwErr("COURSE_ENROLL_005", 400, "该课程未设置积分价格");
        }
        const pointService = strapi.plugin("zhao-point")?.service("point");
        if (!pointService?.deductPoints) {
          throwErr("COURSE_ENROLL_006", 503, "积分服务不可用");
        }
        try {
          await pointService.deductPoints({
            userId,
            action: "course_exchange",
            points: pointsPrice,
            source: `course:${course.document_id}`,
            remark: `兑换课程《${course.title || ""}》`,
          });
        } catch (err: any) {
          throwErr("COURSE_ENROLL_007", 400, err?.message || "积分兑换失败");
        }
        baseData.status = "enrolled";
        baseData.pointsSpent = pointsPrice;
      } else if (enrollType === "paid") {
        // 付费课程：凭证审核
        if (!voucherUrl) {
          throwErr("COURSE_ENROLL_008", 400, "请上传付款凭证");
        }
        baseData.status = "pending_review";
        baseData.voucherUrl = voucherUrl;
        baseData.voucherNote = voucherNote || "";
        baseData.enrolledAt = null; // 待审核，未开通
      } else if (enrollType === "code") {
        // 开通码兑换
        if (!accessCode) {
          throwErr("COURSE_ENROLL_009", 400, "请输入开通码");
        }
        await consumeAccessCode(userId, course.id, accessCode);
        baseData.status = "enrolled";
        baseData.accessCode = accessCode;
      } else {
        throwErr("COURSE_ENROLL_010", 400, `无效的报名类型: ${enrollType}`);
      }

      // 5. 创建 enrollment 记录
      const enrollment = await strapi.documents(UID).create({ data: baseData });

      // 6. 已开通的课程同步创建 user-course-auth 记录（学习权限）
      if (baseData.status === "enrolled") {
        await grantCourseAccess(userId, course.id, enrollType);
      }

      return enrollment;
    },

    /**
     * 管理员审核通过
     */
    async approve(documentId: string, reviewerId: number) {
      const enrollment = await strapi.db.query(UID).findOne({
        where: { document_id: documentId },
        populate: { course: true, user: true },
      });
      if (!enrollment) {
        throwErr("COURSE_ENROLL_011", 404, "报名记录不存在");
      }
      if (enrollment.status !== "pending_review") {
        throwErr("COURSE_ENROLL_012", 400, "仅待审核状态可执行此操作");
      }
      const now = new Date();
      const updated = await strapi.documents(UID).update({
        documentId,
        data: {
          status: "enrolled",
          reviewer: reviewerId,
          reviewedAt: now,
          enrolledAt: now,
        },
      });
      // 同步开通学习权限
      await grantCourseAccess(enrollment.user.id, enrollment.course.id, "paid");
      return updated;
    },

    /**
     * 管理员驳回
     */
    async reject(documentId: string, reviewerId: number, reviewNote: string) {
      const enrollment = await strapi.db.query(UID).findOne({
        where: { document_id: documentId },
      });
      if (!enrollment) {
        throwErr("COURSE_ENROLL_011", 404, "报名记录不存在");
      }
      if (enrollment.status !== "pending_review") {
        throwErr("COURSE_ENROLL_012", 400, "仅待审核状态可执行此操作");
      }
      return strapi.documents(UID).update({
        documentId,
        data: {
          status: "rejected",
          reviewer: reviewerId,
          reviewedAt: new Date(),
          reviewNote: reviewNote || "",
        },
      });
    },

    /**
     * 管理员撤销已开通权限
     */
    async revoke(documentId: string, reviewerId: number, reviewNote: string) {
      const enrollment = await strapi.db.query(UID).findOne({
        where: { document_id: documentId },
        populate: { course: true, user: true },
      });
      if (!enrollment) {
        throwErr("COURSE_ENROLL_011", 404, "报名记录不存在");
      }
      if (enrollment.status !== "enrolled") {
        throwErr("COURSE_ENROLL_013", 400, "仅已开通状态可撤销");
      }
      const updated = await strapi.documents(UID).update({
        documentId,
        data: {
          status: "revoked",
          reviewer: reviewerId,
          reviewedAt: new Date(),
          reviewNote: reviewNote || "",
        },
      });
      // 同步撤销学习权限：标记 user-course-auth 过期
      const authRecord = await strapi.db.query(USER_AUTH_UID).findOne({
        where: { user: enrollment.user.id, course: enrollment.course.id },
      });
      if (authRecord) {
        await strapi.db.query(USER_AUTH_UID).update({
          where: { id: authRecord.id },
          data: { isExpired: true, expiresAt: new Date() },
        });
      }
      return updated;
    },

    // 暴露内部函数供 access-code service 或测试调用
    consumeAccessCode,
    grantCourseAccess,
  };
};
