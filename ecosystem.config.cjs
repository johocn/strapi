module.exports = {
  apps: [
    {
      name: 'strapi',
      script: 'npm',
      args: 'run start',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        // 抑制 pg 模块弃用警告输出到 stderr（非致命，不影响功能）
        NODE_NO_WARNINGS: '1',
        // 增大数据库连接池，减少同一连接上的并发查询竞争
        DATABASE_POOL_MIN: '2',
        DATABASE_POOL_MAX: '10',
      },
      max_memory_restart: '2G',
      exp_backoff_restart_delay: 200,
      max_restarts: 10,
    },
  ],
};
