import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-course.course-access-code";
const COURSE_UID = "plugin::zhao-course.course";

// 开通码字符集：大写字母+数字，排除易混字符 O/0/I/1
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export default ({ strapi }: { strapi: Core.Strapi }) => {
  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  /** 生成单个 8 位开通码（格式：XXXX-XXXX） */
  function generateCode(): string {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
      if (i === 3) code += "-";
    }
    return code;
  }

  /** 生成不重复的开通码集合 */
  async function generateUniqueCodes(count: number, existingSet: Set<string>): Promise<string[]> {
    const codes: string[] = [];
    let attempts = 0;
    const maxAttempts = count * 10; // 防止无限循环
    while (codes.length < count && attempts < maxAttempts) {
      const code = generateCode();
      if (!existingSet.has(code)) {
        existingSet.add(code);
        codes.push(code);
      }
      attempts++;
    }
    if (codes.length < count) {
      throwErr("COURSE_CODE_001", 500, "开通码生成失败，请重试");
    }
    return codes;
  }

  return {
    async find(query: any = {}) {
      return strapi.documents(UID).findMany({
        ...query,
        populate: { course: true, createdBy: true, usedBy: true },
      });
    },

    async findOne(documentId: string) {
      return strapi.documents(UID).findOne({
        documentId,
        populate: { course: true, createdBy: true, usedBy: true },
      });
    },

    /**
     * 批量生成开通码
     */
    async batchGenerate(creatorId: number, params: {
      courseDocumentId: string;
      count: number;
      totalQuota?: number;
      expireAt?: string;
      batchNote?: string;
    }) {
      const { courseDocumentId, count, totalQuota, expireAt, batchNote } = params;

      // 参数校验
      if (!courseDocumentId) {
        throwErr("COURSE_CODE_002", 400, "请选择课程");
      }
      const safeCount = Math.min(Math.max(1, Number(count) || 1), 100); // 1-100
      const quota = totalQuota === undefined || totalQuota === null ? -1 : Math.max(-1, Number(totalQuota));

      // 查询课程
      const course = await strapi.db.query(COURSE_UID).findOne({
        where: { document_id: courseDocumentId },
        select: ["id", "title"],
      });
      if (!course) {
        throwErr("COURSE_CODE_003", 404, "课程不存在");
      }

      // 查询已存在的码，避免重复
      const existingCodes = await strapi.db.query(UID).findMany({
        where: { course: course.id },
        select: ["code"],
      });
      const existingSet = new Set((existingCodes || []).map((c: any) => c.code));

      // 生成唯一码
      const codes = await generateUniqueCodes(safeCount, existingSet);

      // 批量创建
      const created: any[] = [];
      for (const code of codes) {
        const record = await strapi.documents(UID).create({
          data: {
            code,
            course: course.id,
            totalQuota: quota,
            usedCount: 0,
            expireAt: expireAt || null,
            status: "active",
            createdBy: creatorId,
            batchNote: batchNote || "",
          },
        });
        created.push(record);
      }

      return { count: created.length, codes, records: created };
    },

    /**
     * 禁用开通码
     */
    async disable(documentId: string) {
      const accessCode = await strapi.db.query(UID).findOne({
        where: { document_id: documentId },
      });
      if (!accessCode) {
        throwErr("COURSE_CODE_004", 404, "开通码不存在");
      }
      if (accessCode.status === "disabled") {
        throwErr("COURSE_CODE_005", 400, "开通码已禁用");
      }
      return strapi.documents(UID).update({
        documentId,
        data: { status: "disabled" },
      });
    },

    async delete(documentId: string) {
      return strapi.documents(UID).delete({ documentId });
    },
  };
};
