module.exports = {
  apps: [{
    name: 'strapi',
    script: 'npm',
    args: 'run start',
    cwd: __dirname,
    node_args: '--max-old-space-size=1280',
    env: {
      NODE_ENV: 'production',
      NODE_NO_WARNINGS: '1',
      DATABASE_POOL_MIN: '1',
      DATABASE_POOL_MAX: '3',
    },
    max_memory_restart: '2048M',
    // —— crash-loop 防护（2026-10-14，防 OOM 死循环）——
    // strapi 正常启动 ~110s（bootstrap 自动跑 zhao-search 全量）；min_uptime 默认 1s 时，
    // OOM 在 ~100s 杀掉进程会被判 stable、重启计数清零 → max_restarts 形同虚设（曾 ↺ 6200+）。
    // min_uptime 提到 150s 后，启动期死亡全部计为 unstable，连续 5 次 pm2 即放弃重启；
    // 重试按 exp_backoff 指数退避（10s→20s→40s…）减少空转。日常重启走 scripts/safe-restart.sh。
    min_uptime: 150000,
    max_restarts: 5,
    exp_backoff_restart_delay: 10000,
  }],
};
