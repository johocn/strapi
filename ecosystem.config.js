module.exports = {
  apps: [
    {
      name: 'strapi',
      cwd: __dirname,
      script: 'node_modules/@strapi/strapi/bin/strapi.js',
      args: 'develop',
      interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      watch: false,
      out_file: './.pm2-logs/out.log',
      error_file: './.pm2-logs/error.log',
      merge_logs: true,
      time: true,
    },
  ],
};
