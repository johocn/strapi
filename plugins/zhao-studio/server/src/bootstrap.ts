export default ({ strapi }: { strapi: any }) => {
  // 依赖检查（仅 warn 不阻塞）
  const checkPlugin = (name: string) => {
    try {
      const p = strapi.plugin(name);
      if (!p) {
        strapi.log.warn(`[zhao-studio] 依赖插件 ${name} 未启用，推广渠道跨插件功能将不可用`);
      }
    } catch {
      strapi.log.warn(`[zhao-studio] 依赖插件 ${name} 未启用，推广渠道跨插件功能将不可用`);
    }
  };
  checkPlugin('zhao-track');
  checkPlugin('zhao-deal');
};