'use strict';

import jobs from './jobs';

export default ({ strapi }) => {
  // 初始化队列任务
  jobs({ strapi });

  strapi.log.info('[zhao-wealth] 插件已启动');
};