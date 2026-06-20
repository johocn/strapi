import type { Core } from "@strapi/strapi";

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  try {
    const i18n = strapi.plugin("zhao-common").service("i18n");
    i18n.setMessages({
      QUIZ_001: "题目不存在",
      QUIZ_002: "无权访问该题目",
      QUIZ_003: "答题参数错误",
      QUIZ_004: "考试不存在",
      QUIZ_005: "考试次数已达上限",
      QUIZ_006: "考试已超时",
      QUIZ_007: "批量导入格式错误",
      QUIZ_008: "文件解析失败",
      QUIZ_009: "用户答案错误格式",
      QUIZ_010: "积分领取成功",
      QUIZ_011: "问答题待评分",
      QUIZ_012: "该记录已完成评分",
      QUIZ_013: "无权进行评分操作",
      QUIZ_016: "课时不存在",
      QUIZ_017: "请先完成课时内容再答题",
    });
  } catch {
    // zhao-common 插件未启用时静默忽略
  }
};

export default register;
