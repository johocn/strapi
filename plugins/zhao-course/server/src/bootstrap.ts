import type { Core } from "@strapi/strapi";

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("zhao-course: 插件已加载，路由配置已注册");

  // 启动时扫描渠道配置异常的课程（specific 模式 + channelIds 非空 + pointChannel 为空）
  try {
    const courseService = strapi.plugin("zhao-course").service("course");
    if (courseService?.listChannelConfigInvalid) {
      const invalid = await courseService.listChannelConfigInvalid();
      if (invalid.length > 0) {
        strapi.log.warn(
          `[zhao-course] 检测到 ${invalid.length} 个课程渠道配置异常（specific + channelIds 非空 + pointChannel 为空）：`
        );
        for (const c of invalid) {
          strapi.log.warn(
            `  - course.documentId=${c.documentId} title=${c.title} channelIds=${JSON.stringify(c.channelIds)} pointChannel=${c.pointChannel}`
          );
        }
      } else {
        strapi.log.info("[zhao-course] 渠道配置巡检通过：所有 specific 课程均已设置 pointChannel");
      }
    }
  } catch (e) {
    strapi.log.error(`[zhao-course] 渠道配置巡检失败: ${e instanceof Error ? e.message : String(e)}`);
  }
};

export default bootstrap;
