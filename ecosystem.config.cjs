module.exports = {
  apps: [{
    name: 'strapi',
    script: 'node_modules/@strapi/strapi/bin/strapi.js',
    args: 'develop',
    cwd: 'd:\\zhao\\strapi',
    watch: false,
    autorestart: true,
    env: {
      NODE_ENV: 'development',
    },
  }],
};
