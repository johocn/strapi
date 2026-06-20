import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-course.user-course-auth";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  return {
  async find(query: any = {}) {
    return strapi.documents(UID).findMany({
      ...query,
      populate: { user: true, course: true },
    });
  },

  async findOne(documentId: string) {
    return strapi.documents(UID).findOne({
      documentId,
      populate: { user: true, course: true },
    });
  },

  async create(data: any) {
    return strapi.documents(UID).create({ data });
  },

  async update(documentId: string, data: any) {
    return strapi.documents(UID).update({ documentId, data });
  },

  async delete(documentId: string) {
    return strapi.documents(UID).delete({ documentId });
  },

  /**
   * 检查用户是否有权访问课程
   */
  async checkAuth(userId: number, courseDocumentId: string): Promise<{ authorized: boolean; auth?: any }> {
    const course = await strapi.documents("plugin::zhao-course.course").findOne({
      documentId: courseDocumentId,
    });

    if (!course) {
      const i18n = strapi.plugin("zhao-common")?.service("i18n");
      const msg = i18n ? i18n.t("COURSE_001", { courseId: courseDocumentId }) : "课程不存在";
      throwErr("COURSE_001", 404, msg);
    }

    // 免费课程自动授权
    if (!course.isPaid) {
      const existing = await strapi.db.query(UID).findOne({
        where: { user: userId, course: course.id },
      });
      if (!existing) {
        await strapi.documents(UID).create({
          data: {
            user: userId,
            course: course.id,
            authType: "free",
            isExpired: false,
          },
        });
      }
      return { authorized: true };
    }

    // 收费课程检查授权记录
    const auth = await strapi.db.query(UID).findOne({
      where: { user: userId, course: course.id },
    });

    if (!auth) {
      return { authorized: false };
    }

    // 检查过期
    if (auth.expiresAt && new Date(auth.expiresAt) < new Date()) {
      await strapi.db.query(UID).update({
        where: { id: auth.id },
        data: { isExpired: true },
      });
      return { authorized: false, auth };
    }

    return { authorized: true, auth };
  },

  /**
   * 获取用户的授权课程列表
   */
  async getUserAuthCourses(userId: number) {
    return strapi.db.query(UID).findMany({
      where: { user: userId, isExpired: false },
      populate: { course: true },
    });
  },
  };
};
