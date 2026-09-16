#!/usr/bin/env node
// 在 Strapi 应用上下文内，经 service/db 补写 sso_apps 白名单（不覆盖原有条目，仅合并追加真实回调）
// 重启不会丢失：bootstrap 仅在应用不存在时才用默认值重建
const { createStrapi } = require('./node_modules/@strapi/strapi');

const NEW_CALLBACKS = [
  'https://h.joho.cn/#/pages/sso/login-callback',
  'http://h.joho.cn/#/pages/sso/login-callback',
  'https://h.joho.cn/#/pages/login-callback',
  'http://h.joho.cn/#/pages/login-callback',
];

async function main() {
  const strapi = await createStrapi({
    appDir: '/www/apps/strapi',
    distDir: '/www/apps/strapi/dist',
    autoReload: false,
  }).load();
  const uid = 'plugin::zhao-sso.sso-app';
  const targets = ['course', 'default', 'wealth', 'e-joho-app'];

  for (const code of targets) {
    const app = await strapi.db.query(uid).findOne({ where: { app_code: code } });
    if (!app) { console.log('SKIP', code, 'not found'); continue; }
    const merged = [...(app.redirect_uris || [])];
    for (const cb of NEW_CALLBACKS) {
      if (!merged.includes(cb)) merged.push(cb);
    }
    const upd = await strapi.db.query(uid).update({
      where: { id: app.id },
      data: { redirect_uris: merged },
    });
    console.log('UPDATED', code, '(id', upd.id + ')', JSON.stringify(upd.redirect_uris));
  }

  await strapi.destroy();
  process.exit(0);
}

main().catch((e) => { console.error('FATAL', e && e.message); process.exit(1); });