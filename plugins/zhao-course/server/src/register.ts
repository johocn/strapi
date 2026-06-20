import type { Core } from "@strapi/strapi";

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  try {
    const zhaoCommon = strapi.plugin("zhao-common");
    if (!zhaoCommon) {
      strapi.log.warn("zhao-course: zhao-common 插件未启用，i18n 未注册");
      return;
    }
    const i18n = zhaoCommon.service("i18n");
    if (!i18n || typeof i18n.setMessages !== "function") {
      strapi.log.warn("zhao-course: zhao-common i18n 服务不可用");
      return;
    }
    i18n.setMessages({
      COURSE_001: "课程不存在 (id={courseId})",
      COURSE_002: "课程未启用积分",
      COURSE_003: "课程积分已领取",
      COURSE_004: "课程未完成，无法领取积分",
      COURSE_005: "无权访问该课程",
      COURSE_006: "课程授权已过期",
      COURSE_007: "课程为收费课程，请先购买",
      COURSE_008: "无可领取课程积分",
      LESSON_001: "课时不存在 (id={lessonId})",
      LESSON_002: "课时未启用积分",
      LESSON_003: "课时积分已领取",
      LESSON_004: "课时未完成，无法领取积分",
      LESSON_005: "课时需答题才能获得积分",
      LESSON_006: "答题错误，无法获得积分",
      LESSON_007: "无可领取课时积分",
      PROGRESS_001: "学习进度记录不存在",
      PROGRESS_002: "非法进度上报",
    });
  } catch (err) {
    strapi.log.warn("zhao-course: i18n 注册失败", err);
  }
  strapi.log.info("zhao-course: 插件已加载，路由配置已注册");
};

export default register;
