'use strict';

import pluginConfig from './config';

export default ({ strapi }) => {
  // 注册插件配置（供 scoring-service 等通过 strapi.config.get('plugin::zhao-wealth') 访问）
  strapi.config.set('plugin::zhao-wealth', pluginConfig);
  strapi.log.info('[zhao-wealth] 插件已注册（config 已加载）');
};