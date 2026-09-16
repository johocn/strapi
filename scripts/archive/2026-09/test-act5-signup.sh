#!/usr/bin/env bash
set -e
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
cd /www/apps/strapi

cat > /tmp/test-act5-signup.js <<'EOF'
const { createStrapi } = require('@strapi/strapi');

async function main() {
  const strapi = createStrapi({ appDir: process.cwd(), distDir: './dist' });
  await strapi.load();
  await strapi.register();

  const userId = 2;                    // sso=up user 赵义涛
  const activityId = 'd52v3l0o76hejmpt9ktwxvf1'; // 活动5 活动报名测试
  const formData = { name: '赵义涛', phone: '13800000000', remark: '自动实测' };

  try {
    const service = strapi.plugin('zhao-point').service('activity');
    // 先查活动真实数据，确认 venue/时间在运行时取值
    const act = await strapi.documents('plugin::zhao-point.activity').findOne({
      documentId: activityId,
      populate: { venue: true },
    });
    console.log('RT venue?.name =', act?.venue?.name);
    console.log('RT venue_name  =', act?.venue_name);
    console.log('RT start  =', act?.startTime);
    console.log('RT end    =', act?.endTime);

    const ret = await service.signup({
      userId,
      activityId,
      formData,
    });
    console.log('SIGNUP_RESULT', JSON.stringify(ret));
  } catch (e) {
    console.error('SIGNUP_ERR', String(e && e.message || e));
    if (e && e.errors) console.error('DETAIL', JSON.stringify(e.errors));
  } finally {
    await strapi.destroy().catch(()=>{});
    process.exit(0);
  }
}
main();
EOF

node --max-old-space-size=512 /tmp/test-act5-signup.js 2>&1 | tail -40