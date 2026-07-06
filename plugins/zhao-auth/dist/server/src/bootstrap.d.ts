import { Core } from '@strapi/strapi';
/**
 * zhao-auth 引导函数
 * 启动时自动初始化默认角色（如果不存在）
 */
declare const bootstrap: ({ strapi }: {
    strapi: Core.Strapi;
}) => Promise<void>;
export default bootstrap;
