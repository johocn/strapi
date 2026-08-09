module.exports = {
  apps: [
    {
      name: 'strapi',
      script: 'npm',
      args: 'run start',
      cwd: __dirname,
      // 限制 Node.js 堆内存上限，适配 2G 服务器多服务共存
      node_args: '--max-old-space-size=384',
      env: {
        NODE_ENV: 'production',
        // 抑制 pg 模块弃用警告输出到 stderr（非致命，不影响功能）
        NODE_NO_WARNINGS: '1',
        // 数据库连接池保持小而精，减少内存占用
        DATABASE_POOL_MIN: '1',
        DATABASE_POOL_MAX: '3',
      },
      max_memory_restart: '500M',
      exp_backoff_restart_delay: 200,
      max_restarts: 10,
    },
  ],
};
