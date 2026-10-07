module.exports = {
  apps: [{
    name: 'strapi', script: 'npm', args: 'run start',
    cwd: '/www/apps/strapi', env: { NODE_OPTIONS: '--max-old-space-size=500' },
    max_restarts: 10, watch: false,
  }]
};
