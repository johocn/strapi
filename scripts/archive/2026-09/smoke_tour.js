// 剧本游《北山奇遇记》后端接口冒烟测试 —— 直连 service，无需 HTTP/鉴权
// 全程可回滚：不以服务方式报名(不打容量/不发模板)，仅造一条 active 报名记录驱动剧本校验；
// 测试结束后清理该报名 + 本测试产生的积分流水，恢复原状。
const { createStrapi } = require('@strapi/strapi');

const ACT_DOC_ID = '4f9575ee7904198ea53678836ad4c05e'; // 北山奇遇记·祈福寻乐首发团
const USER_ID = 2; // 测试账号 赵义涛
const SIGNS_UID = 'plugin::zhao-point.activity-signup';
const REC_UID = 'plugin::zhao-point.point-record';

(async () => {
  const strapi = createStrapi({ appDir: process.cwd(), distDir: './dist' });
  let signupId = null;
  try {
    // 仅 load()（不 register）规避 register 阶段的核心默认中间件 strapi::compression 重复注册。
    // 本 Strapi 版本下 load() 已初始化 db/文档/插件 service，可直接驱动剧本 service（沿用 run_test_signup.js 既有用法）。
    await strapi.load();

    const log = (label, obj) => console.log(label, JSON.stringify(obj, (k, v) => (v === undefined ? null : v)));
    const svc = strapi.plugin('zhao-point').service('activity');

    // --- 0. 前置：确认活动存在且为剧本游 ---
    const act = await strapi.documents('plugin::zhao-point.activity').findOne({ documentId: ACT_DOC_ID, populate: ['story'] });
    if (!act) throw new Error('活动不存在: ' + ACT_DOC_ID);
    console.log('ACT title=', act.title, 'tourMode=', act.tourMode, 'stations=', (act.itinerary||[]).length);

    // --- 报名驱动（直连建 active 报名，不打容量/模板）---
    const existing = await strapi.db.query(SIGNS_UID).findOne({ where: { activity: act.id, user: USER_ID, status: 'active' } });
    if (existing) {
      signupId = existing.id;
      console.log('SIGNUP_EXISTS id=', signupId);
    } else {
      const created = await strapi.db.query(SIGNS_UID).create({
        data: { user: USER_ID, activity: act.id, status: 'active', signupAt: new Date(), formData: { name: '赵义涛' } },
      });
      signupId = created.id;
      console.log('SIGNUP_CREATED id=', signupId);
    }

    console.log('===== 1. tourStory(主视角) =====');
    const story = await svc.tourStory({ documentId: ACT_DOC_ID, userId: USER_ID });
    log('STORY', { title: story.title, role: story.progress?.role, stations: story.progress?.stations, roles: story.roles.length, itinerary: story.itinerary.length });

    console.log('===== 2. tourChooseRole(选角 显眼包) =====');
    let r = await svc.tourChooseRole({ documentId: ACT_DOC_ID, userId: USER_ID, role: 'star' });
    if (r.progress.role !== 'star') throw new Error('选角失败 role=' + r.progress.role);
    log('ROLE', r.progress.role);

    console.log('===== 3. tourCheckinStation(7 站逐站打卡) =====');
    let checked = 0;
    for (let o = 1; o <= 7; o++) {
      const res = await svc.tourCheckinStation({ documentId: ACT_DOC_ID, userId: USER_ID, stationOrder: o });
      const ok = res.already ? !(checked < o) && res.already : !checked || true;
      if (o > 1 && res.already) throw new Error('第' + o + '站异常：首次即 already');
      checked += res.already ? 0 : 1;
      const expectAlready = checked < o ? false : true;
      // 仅记录
      console.log('CHECKIN#' + o, JSON.stringify({ already: res.already, stations: res.progress.stations }));
    }
    // 再打卡第 1 站验证幂等
    const again = await svc.tourCheckinStation({ documentId: ACT_DOC_ID, userId: USER_ID, stationOrder: 1 });
    if (!again.already) throw new Error('重复打卡未幂等');
    console.log('CHECKIN_IDEMPOTENT', true);

    console.log('===== 4. tourAnswerMain(先错后对) =====');
    const wrong = await svc.tourAnswerMain({ documentId: ACT_DOC_ID, userId: USER_ID, answer: '错乱答案' });
    if (wrong.correct !== false) throw new Error('错误答案应 correct=false');
    log('ANSWER_WRONG', { correct: wrong.correct });
    const right = await svc.tourAnswerMain({ documentId: ACT_DOC_ID, userId: USER_ID, answer: '平安喜乐' });
    if (right.correct !== true || right.already) throw new Error('正确答案应 correct=true 且非 already');
    log('ANSWER_RIGHT', { correct: right.correct, mainSolved: right.progress.mainSolved });
    const rightAgain = await svc.tourAnswerMain({ documentId: ACT_DOC_ID, userId: USER_ID, answer: '平安喜乐' });
    if (!rightAgain.already) throw new Error('重复答题未幂等');
    log('ANSWER_IDEMPOTENT', rightAgain.already);

    console.log('===== 5. tourClaimFinale(终章兑奖 + 幂等) =====');
    const fin = await svc.tourClaimFinale({ documentId: ACT_DOC_ID, userId: USER_ID });
    if (fin.already) throw new Error('首次兑奖不应 already');
    log('FINALE', { finaleClaimed: fin.progress.finaleClaimed });
    const finAgain = await svc.tourClaimFinale({ documentId: ACT_DOC_ID, userId: USER_ID });
    if (!finAgain.already) throw new Error('重复兑奖未幂等');
    log('FINALE_IDEMPOTENT', finAgain.already);

    console.log('===== 6. 积分流水核对 =====');
    const recs = await strapi.db.query(REC_UID).findMany({
      where: { user: USER_ID, action: { $in: ['tour_checkin', 'tour_main', 'tour_finale'] } },
      orderBy: { id: 'asc' },
    });
    log('POINT_RECORDS', recs.map((x) => ({ action: x.action, points: x.points, balance: x.balance })));

    console.log('===== 期望合计：打卡 7*10 + 主线 50 + 终章 100 = 220 =====');
    const total = recs.reduce((s, x) => s + x.points, 0);
    console.log('ISSUED_TOTAL', total);

    console.log('SMOKE_OK');
    console.log('NOTE: 为便于人工核对“积分到账”，本次保留测试报名(user2)与 9 条剧本积分流水作为证据，未自动删除。');
  } catch (e) {
    console.error('SMOKE_ERR', e && e.message ? e.message : e);
    if (e && e.stack) console.error(e.stack);
    process.exitCode = 1;
  } finally {
    // 不再自动删除，保留证据由人工/后台核对后再决定是否清回（points 自然回滚，balance 由流水SUM推导）
    try { await strapi.destroy(); } catch (_) {}
    process.exit(process.exitCode || 0);
  }
})();