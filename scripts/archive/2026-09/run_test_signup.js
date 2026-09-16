// 一次性实测脚本：为 userId=2 报名「动感吉林」，触发 act_confirm 微信模板消息
// 运行：cd /www/apps/strapi && node run_test_signup.js
const { createStrapi } = require('@strapi/strapi');

(async () => {
  const strapi = createStrapi();
  try {
    await strapi.load();
    const svc = strapi.plugin('zhao-point').service('activity');
    const userId = 2; // 赵义涛
    const activityId = 'ghanuzsbhi9qonnm712ss2wn'; // 动感吉林
    const r = await svc.signup({ userId, activityId, formData: {}, preQuestionnaireData: {}, chosenRewards: [] });
    console.log('RESULT', JSON.stringify(r, (k, v) => (v === undefined ? null : v)));
  } catch (e) {
    console.error('ERROR', e && e.message, e && e.stack);
  } finally {
    await strapi.destroy();
    process.exit(0);
  }
})();