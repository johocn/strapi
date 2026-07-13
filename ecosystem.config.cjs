module.exports = {
  apps: [
    {
      name: 'strapi',
      script: 'npm',
      args: 'run start',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '1G',
      exp_backoff_restart_delay: 200,
      max_restarts: 10,
    },
  ],
};
