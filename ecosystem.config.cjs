module.exports = {
  apps: [{
    name: 'strapi',
    // 生产模式：从 dist/ 构建产物启动（服务器禁止构建，dist 由本地构建后提交）
    script: 'npm',
    args: 'run start',
    cwd: __dirname,
    // 限制 Node.js V8 堆内存上限为 384MB（2G 服务器内存优化）
    node_args: '--max-old-space-size=384',
    env: {
      NODE_ENV: 'production',
      // 抑制 pg 模块弃用警告输出到 stderr（非致命，不影响功能）
      NODE_NO_WARNINGS: '1',
      // 数据库连接池保持小而精，减少内存占用
      DATABASE_POOL_MIN: '1',
      DATABASE_POOL_MAX: '3',
    },
    // PM2 内存阈值，超过 500M 自动重启
    max_memory_restart: '500M',
    exp_backoff_restart_delay: 200,
    max_restarts: 10,
  }],
};
