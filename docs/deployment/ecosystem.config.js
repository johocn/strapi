/**
 * PM2 进程管理配置
 * 
 * 使用方式：
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup    # 设置开机自启
 * 
 * 常用命令：
 *   pm2 status           # 查看状态
 *   pm2 logs strapi      # 查看日志
 *   pm2 restart strapi   # 重启
 *   pm2 stop strapi      # 停止
 */
module.exports = {
  apps: [{
    name: 'strapi',
    cwd: '/home/admin/strapi',
    script: 'npm',
    args: 'start',
    instances: 1,                // Strapi 不支持多实例（数据库迁移竞争）
    exec_mode: 'fork',
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000,         // 重启间隔 5 秒
    watch: false,
    max_memory_restart: '2G',    // 内存超过 2G 自动重启
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/home/admin/logs/error.log',
    out_file: '/home/admin/logs/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
