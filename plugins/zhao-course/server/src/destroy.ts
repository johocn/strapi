import type { Core } from "@strapi/strapi";

/**
 * 销毁阶段 - 清理资源
 */
const destroy = ({ strapi: _strapi }: { strapi: Core.Strapi }) => {
  // 清理逻辑（如需）
};

export default destroy;
