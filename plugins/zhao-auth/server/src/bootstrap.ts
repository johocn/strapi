import type { Core } from "@strapi/strapi";

/**
 * zhao-auth 引导函数
 * 启动时自动初始化默认角色（如果不存在）
 */
const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("zhao-auth: 插件已启动");

  // 延时初始化默认角色，等待内容类型注册完成
  setTimeout(async () => {
    try {
      const results = await strapi
        .plugin("zhao-auth")
        .service("permission")
        .initDefaultRoles();

      if (results && results.length) {
        strapi.log.info(
          `zhao-auth: 角色初始化完成 [${results.join(", ")}]`
        );
      }
    } catch (error: any) {
      strapi.log.warn(
        `zhao-auth: 角色初始化失败（可能是 content-type 尚未就绪，可通过 POST /api/zhao-auth/v1/admin/permissions/init 手动触发）: ${
          error?.message || String(error)
        }`
      );
    }
  }, 3000);
};

export default bootstrap;
