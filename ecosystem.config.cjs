module.exports = {
  apps: [{
    name: 'strapi',
    // 生产模式：从 dist/ 构建产物启动（服务器禁止构建，dist 由本地构建后提交）
    // cluster 模式下不能通过 npm 包装启动，必须直接指向 strapi CLI
    script: './node_modules/@strapi/strapi/bin/strapi.js',
    args: 'start',
    cwd: __dirname,
    // 双实例滚动发布，消除单实例重启期间的 502 中断
    instances: 2,
    exec_mode: 'cluster',
    // 限制单实例 V8 堆内存上限为 256MB（2G 服务器载双实例，总量与单实例 384M 接近）
    node_args: '--max-old-space-size=256',
    // 给足优雅退出时间，等待在途请求处理完成
    kill_timeout: 10000,
    env: {
      NODE_ENV: 'production',
      // 抑制 pg 模块弃用警告输出到 stderr（非致命，不影响功能）
      NODE_NO_WARNINGS: '1',
      // 数据库连接池保持小而精，减少内存占用（双实例合计 6 连接）
      DATABASE_POOL_MIN: '1',
      DATABASE_POOL_MAX: '3',
    },
    // PM2 内存阈值，单实例超过 360M 自动重启
    max_memory_restart: '360M',
    exp_backoff_restart_delay: 200,
    max_restarts: 10,
  }],
};