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
    exp_backoff_restart_delay: 200,
    max_restarts: 10,
  }],
};
