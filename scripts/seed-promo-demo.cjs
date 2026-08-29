/* 活动宣传页 5 风格演示种子数据
 * 用法: cd e:\code\basic && node scripts/seed-promo-demo.cjs
 * 创建 5 个演示活动（summit 尊享峰会 / salon 私享沙龙 / training 实战训练 / action 热血行动 / life 品质生活）
 * 每个方案 promoTemplate 不同（配色不同）、模块编排与内容不同（演示效果多样）、含报名权益+联系方式+留言（突出互动）。
 * 幂等可重跑：按「演示-宣传页-」标题前缀清理旧活动/留言/讲师/场地。
 * 运行前置: 本地 Strapi develop(127.0.0.1:1337) 运行且 zhao-point 已重编译
 */
const { Client } = require('pg');

const BASE = 'http://127.0.0.1:1337/api';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const TITLE_PREFIX = '演示-宣传页-';
const LECTURER_PREFIX = '演示讲师-';
const VENUE_PREFIX = '演示场地-';
const PIC = (seed) => `https://picsum.photos/seed/${seed}/900/520`;

let client;
const out = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let r;
  for (let i = 0; i < 25; i++) {
    try { r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined }); break; }
    catch (e) { if (i === 24) return { status: 0, json: { netErr: e.message } }; await sleep(600); }
  }
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, json };
}

async function waitForAdmin() {
  for (let i = 0; i < 30; i++) {
    const r = await api('POST', '/zhao-auth/v1/login', { body: { identifier: '1117', password: 'a123456' } });
    if (r.status === 200 && r.json?.jwt) return r.json.jwt;
    await sleep(800);
  }
  return null;
}

const q = async (sql, params) => (await client.query(sql, params)).rows;

/** 相对未来某天时刻的 ISO（无秒） */
function dt(offsetDays, hour, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(hour)}:${p(minute)}`;
}
const nowIso = () => dt(0, new Date().getHours(), new Date().getMinutes());

/** 删除演示活动及其留言、演示讲师/场地（raw-pg 幂等清理） */
async function purgeExisting() {
  const acts = await q(`SELECT id::int AS id FROM activities WHERE title LIKE $1`, [`${TITLE_PREFIX}%`]);
  for (const a of acts) {
    const msgs = await q(`SELECT am.id::int AS id FROM activity_messages am
      JOIN activity_messages_activity_lnk al ON al.activity_message_id = am.id WHERE al.activity_id = $1`, [a.id]);
    for (const m of msgs) {
      await client.query(`DELETE FROM activity_messages_activity_lnk WHERE activity_message_id = $1`, [m.id]);
      await client.query(`DELETE FROM activity_messages_user_lnk WHERE activity_message_id = $1`, [m.id]);
      await client.query(`DELETE FROM activity_messages WHERE id = $1`, [m.id]);
    }
    await client.query(`DELETE FROM activities_belongs_to_series_lnk WHERE activity_id = $1`, [a.id]);
    await client.query(`DELETE FROM activities WHERE id = $1`, [a.id]);
  }
  await client.query(`DELETE FROM lecturers WHERE name LIKE $1`, [`${LECTURER_PREFIX}%`]);
  await client.query(`DELETE FROM venues WHERE name LIKE $1`, [`${VENUE_PREFIX}%`]);
  if (acts.length) out.push(`清理旧演示数据: ${acts.length} 个活动`);
}

async function createResource(path, body, token) {
  const r = await api('POST', path, { token, body });
  if (r.status < 200 || r.status >= 300) throw new Error(`${path} 失败: ${JSON.stringify(r.json)}`);
  const d = r.json?.data || r.json;
  return d?.documentId || d?.id || null;
}

/** 创建讲师并返回 documentId */
async function createLecturer(name, desc, token) {
  return createResource('/zhao-point/v1/admin/adm/lecturers', { name, desc, disabled: false }, token);
}
/** 创建场地并返回 documentId */
async function createVenue(name, desc, lat, lng, token) {
  return createResource('/zhao-point/v1/admin/adm/venues', { name, desc, lat, lng, disabled: false }, token);
}

/** 创建活动并返回 { documentId, title } */
async function createActivity(body, token) {
  const r = await api('POST', '/zhao-point/v1/admin/adm/activities', { token, body });
  if (r.status < 200 || r.status >= 300) throw new Error(`创建活动失败: ${JSON.stringify(r.json)}`);
  const d = r.json?.data || r.json;
  return { documentId: d?.documentId || d?.id, title: d?.title || body.title };
}

/* ===================== 5 风格方案定义 ===================== */

const PROMOS = [
  {
    template: 'summit',
    title: `${TITLE_PREFIX}数字增长高峰论坛`,
    activity: {
      type: '论坛',
      category: '讲座',
      description: '2026 数字增长高峰论坛，汇聚 30+ 行业领袖与 500 位增长负责人，围绕「新周期 · 新增长」探讨公私域联动、AI 提效与会员经营三大主线，构建高质量商业社交场域。',
      venueName: '上海国际会议中心 · 东方厅',
      capacity: 500,
      pricingMode: 'flat',
      feeCollectAt: 'signup',
      pointsCost: 0,
      cashPrice: 0,
      status: 'signup_open',
      checkinMode: 'both',
      startTime: dt(7, 9, 0),
      endTime: dt(7, 17, 0),
      signupStart: nowIso(),
      signupEnd: dt(7, 9, 0),
      signupAdvanceHours: 0,
      formConfig: [
        { key: 'company', label: '公司 / 机构', type: 'text', required: false, placeholder: '请输入公司名称' },
        { key: 'position', label: '职位', type: 'text', required: false, placeholder: '如：增长负责人' },
        { key: 'contact_phone', label: '手机号', type: 'phone', required: true, placeholder: '用于接收峰会入场信息' },
      ],
      rewardConfig: {
        loginEnabled: true,
        channel: { type: 'contact', label: '留联系方式' },
        selectMode: 'all',
        rewards: [
          { id: 'r1', name: '峰会资料包（嘉宾PPT合集）', type: 'points', mode: 'single', condition: 'contact', amount: 50 },
          { id: 'r2', name: '2026 增长白皮书电子版', type: 'points', mode: 'single', condition: 'wechat_auth', amount: 80 },
          { id: 'r3', name: '交流晚宴入场资格', type: 'points', mode: 'single', condition: 'survey', amount: 120 },
        ],
      },
      promoTemplate: 'summit',
      promoModules: [
        { type: 'cover', sort: 0, config: { subtitle: '新周期 · 新增长 | 30+ 行业领袖 · 500 位增长负责人' } },
        { type: 'info', sort: 1, config: {} },
        { type: 'rich', sort: 2, config: { html: '<p><strong>为什么值得来？</strong></p><p>一天时间，三大主题会场，看懂下一阶段增长打法：</p><p>① 公私域联动：从流量到留量的一体化运营路径；</p><p>② AI 提效：内容、客服、投放全链路智能化实践；</p><p>③ 会员经营：复购与裂变的底层模型拆解。</p>' } },
        { type: 'highlights', sort: 3, config: { title: '参会三大亮点', points: ['30+ 行业头部嘉宾同台，一手实战案例分享', '圆桌私享局：与操盘手面对面交流增长卡点', '资源对接墙：现场匹配上下游合作机会'] } },
        { type: 'speakers', sort: 4, config: {} },
        { type: 'agenda', sort: 5, config: { title: '主会场议程', items: [
          { t: '09:00', title: '签到 & 社交破冰', desc: '凭电子票签到，领取峰会物料包' },
          { t: '09:30', title: '开幕主旨：新周期下的增长范式', desc: '宏观趋势 + 平台规则变化解读' },
          { t: '11:00', title: '圆桌对话：公私域联动实战', desc: '四位品牌操盘手现场对谈' },
          { t: '12:30', title: '午餐 & 资源对接墙', desc: '自由交流时间' },
          { t: '14:00', title: 'AI 提效分会场', desc: '内容 / 客服 / 投放三场并行' },
          { t: '16:30', title: '闭门颁奖 & 自由交流', desc: '增长案例年度评选揭晓' },
        ] } },
        { type: 'rewards', sort: 6, config: {} },
        { type: 'contact', sort: 7, config: {} },
        { type: 'faq', sort: 8, config: { title: '常见问题', items: [
          { q: '门票免费吗？', a: '本次峰会为公益性质，报名免费，签到后发放资料包与纪念品。' },
          { q: '可以带同事一起吗？', a: '欢迎，请在报名表单中分别填写信息，名额有限先到先得。' },
          { q: '如何获取发票？', a: '免费活动不提供发票，如需参会证明可现场开具。' },
        ] } },
        { type: 'message', sort: 9, config: {} },
      ],
      promoContact: {
        wechat: { qrcode: PIC('wechat-summit'), id: 'joho_summit' },
        phone: '13800001111',
        card: { name: '峰会会务-陈老师', title: '会务总监', company: 'JOHO 科技', phone: '13800001111', wechat: 'joho_summit', avatar: PIC('card-summit') },
        notice: '会务微信工作时间 9:00-18:00，报名相关问题 1 个工作日内回复。',
      },
    },
  },

  {
    template: 'salon',
    title: `${TITLE_PREFIX}AI 提效私享会`,
    activity: {
      type: '沙龙',
      category: '沙龙',
      description: '小场次深度私享会，仅开放 40 席。围绕「AI 如何真正为业务提效」，由一线 AI 应用专家拆解 8 个可直接落地的场景，并现场演示实操。',
      venueName: '杭州运河书房 · 一层分享厅',
      capacity: 40,
      pricingMode: 'flat',
      feeCollectAt: 'signup',
      pointsCost: 0,
      cashPrice: 0,
      status: 'signup_open',
      checkinMode: 'self',
      startTime: dt(14, 14, 0),
      endTime: dt(14, 17, 0),
      signupStart: nowIso(),
      signupEnd: dt(14, 14, 0),
      signupAdvanceHours: 0,
      formConfig: [
        { key: 'industry', label: '所在行业', type: 'text', required: false, placeholder: '如：电商 / 教育 / 制造' },
        { key: 'interest', label: '最想了解的 AI 场景', type: 'select', required: false, options: ['内容创作', '智能客服', '数据分析', '营销投放', '办公提效'] },
        { key: 'contact_phone', label: '手机号', type: 'phone', required: true, placeholder: '用于发送入场确认' },
      ],
      rewardConfig: {
        loginEnabled: true,
        channel: { type: 'survey', label: '回答调查问卷' },
        selectMode: 'any',
        selectN: 1,
        rewards: [
          { id: 'r1', name: 'AI 提效工具清单（50+ 工具）', type: 'points', mode: 'multi', condition: 'survey', amount: 60 },
          { id: 'r2', name: '1v1 AI 应用咨询 15 分钟', type: 'points', mode: 'multi', condition: 'wechat_auth', amount: 100 },
        ],
      },
      promoTemplate: 'salon',
      promoModules: [
        { type: 'cover', sort: 0, config: { subtitle: '40 席小场深度交流 · 8 个可落地场景实操演示', bgImage: PIC('salon-cover') } },
        { type: 'info', sort: 1, config: {} },
        { type: 'rich', sort: 2, config: { html: '<p><strong>本期主题：AI 落地，不止于聊天。</strong></p><p>我们将现场演示 8 个真实业务场景的 AI 改造方案，从提示词工程到智能体搭建，带回一套马上能用的方法论。</p>' } },
        { type: 'speakers', sort: 3, config: {} },
        { type: 'agenda', sort: 4, config: { title: '流程安排', items: [
          { t: '14:00', title: '签到 & 暖场', desc: '领取伴手礼与问卷' },
          { t: '14:20', title: 'AI 提效全景拆解', desc: '8 个落地场景逐个演示' },
          { t: '15:30', title: '现场实操工作坊', desc: '分组动手，导师巡场答疑' },
          { t: '16:30', title: '自由交流', desc: '答疑 + 资源互换' },
        ] } },
        { type: 'images', sort: 5, config: { title: '往期现场', images: [PIC('salon-1'), PIC('salon-2'), PIC('salon-3'), PIC('salon-4')] } },
        { type: 'rewards', sort: 6, config: {} },
        { type: 'contact', sort: 7, config: {} },
        { type: 'message', sort: 8, config: {} },
      ],
      promoContact: {
        wechat: { qrcode: PIC('wechat-salon'), id: 'joho_salon' },
        phone: '13800002222',
        card: { name: '私享会主理-阿悦', title: '内容主理人', company: 'JOHO 科技', phone: '13800002222', wechat: 'joho_salon', avatar: PIC('card-salon') },
        notice: '报名后请添加微信进活动群，具体路线与资料将在群内发布。',
      },
    },
  },

  {
    template: 'training',
    title: `${TITLE_PREFIX}7 天新媒体增长实战训练营`,
    activity: {
      type: '训练营',
      category: '培训',
      description: '7 天高强度实战训练营：从账号定位、内容生产线到投放放大，讲师带着你边学边做，结营产出你的第一份可执行增长方案。',
      venueName: '深圳南山 · 知识产业园 B 栋 3F 教室',
      capacity: 80,
      pricingMode: 'flat',
      feeCollectAt: 'signup',
      pointsCost: 0,
      cashPrice: 0,
      status: 'signup_open',
      checkinMode: 'both',
      startTime: dt(21, 9, 30),
      endTime: dt(21, 16, 30),
      signupStart: nowIso(),
      signupEnd: dt(21, 9, 30),
      signupAdvanceHours: 0,
      formConfig: [
        { key: 'company', label: '公司 / 机构', type: 'text', required: false },
        { key: 'position', label: '职位', type: 'text', required: false },
        { key: 'years', label: '从业年限', type: 'number', required: false, placeholder: '如：3' },
        { key: 'contact_phone', label: '手机号', type: 'phone', required: true },
      ],
      rewardConfig: {
        loginEnabled: true,
        channel: { type: 'contact', label: '留联系方式' },
        selectMode: 'single',
        rewards: [
          { id: 'r1', name: '训练营全套讲义 + 模板', type: 'points', mode: 'multi', condition: 'contact', amount: 80 },
          { id: 'r2', name: '增长学习积分 100 分', type: 'points', mode: 'multi', condition: 'contact', amount: 100 },
          { id: 'r3', name: '1v1 作业点评（讲师亲自批改）', type: 'points', mode: 'multi', condition: 'wechat_auth', amount: 150 },
        ],
      },
      promoTemplate: 'training',
      promoModules: [
        { type: 'cover', sort: 0, config: { subtitle: '7 天，跑通你的内容增长闭环' } },
        { type: 'info', sort: 1, config: {} },
        { type: 'highlights', sort: 2, config: { title: '你将收获', points: ['一套从 0 到 1 的账号定位方法论', '一条可复用的内容生产流水线', '一次真实投放复盘（导师带练）', '一份结营可带走的增长执行方案'] } },
        { type: 'speakers', sort: 3, config: {} },
        { type: 'agenda', sort: 4, config: { title: '7 天课表', items: [
          { t: 'D1', title: '定位与对标', desc: '账号定位 + 竞品拆解作业' },
          { t: 'D2', title: '内容生产线', desc: '选题库搭建 + 批量创作 SOP' },
          { t: 'D3', title: '私域承接', desc: '企微承接链路与话术设计' },
          { t: 'D4', title: '投放放大', desc: '千川 / 信息流投放基础' },
          { t: 'D5', title: '数据复盘', desc: '关键指标与归因分析' },
          { t: 'D6', title: '结营路演', desc: '方案展示 + 导师点评' },
        ] } },
        { type: 'faq', sort: 5, config: { title: '训练营常见问题', items: [
          { q: '零基础可以报名吗？', a: '可以，训练营从定位开始讲起，零基础友好，课后有答疑群。' },
          { q: '需要带电脑吗？', a: '需要，实操环节较多，请自带笔记本电脑。' },
          { q: '结营有什么产出？', a: '每位学员将产出一份可执行的增长方案，优秀方案进入案例库。' },
        ] } },
        { type: 'rewards', sort: 6, config: {} },
        { type: 'contact', sort: 7, config: {} },
        { type: 'message', sort: 8, config: {} },
      ],
      promoContact: {
        wechat: { qrcode: PIC('wechat-training'), id: 'joho_training' },
        phone: '13800003333',
        card: { name: '训练营班主任-大壮', title: '教学负责人', company: 'JOHO 科技', phone: '13800003333', wechat: 'joho_training', avatar: PIC('card-training') },
        notice: '开班前 3 天建立学员群，开课通知与资料在群内发布。',
      },
    },
  },

  {
    template: 'action',
    title: `${TITLE_PREFIX}城市公益夜跑 · 为爱出发`,
    activity: {
      type: '公益跑',
      category: '其他',
      description: '城市公益夜跑 5KM，报名费全数捐赠「乡村儿童阅读计划」。戴上荧光手环，和我们一起跑出夜晚的浪漫，也跑出对乡村孩子的爱。',
      venueName: '广州珠江新城 · 花城广场南广场',
      capacity: 300,
      pricingMode: 'flat',
      feeCollectAt: 'signup',
      pointsCost: 0,
      cashPrice: 0,
      status: 'signup_open',
      checkinMode: 'worker_scan',
      startTime: dt(28, 19, 0),
      endTime: dt(28, 21, 0),
      signupStart: nowIso(),
      signupEnd: dt(28, 19, 0),
      signupAdvanceHours: 0,
      formConfig: [
        { key: 'tshirt', label: 'T 恤尺码', type: 'select', required: false, options: ['S', 'M', 'L', 'XL', 'XXL'] },
        { key: 'emergency', label: '紧急联系人电话', type: 'phone', required: false, placeholder: '用于活动安全报备' },
        { key: 'contact_phone', label: '本人手机号', type: 'phone', required: true },
      ],
      rewardConfig: {
        loginEnabled: true,
        channel: { type: 'contact', label: '留联系方式' },
        selectMode: 'all',
        rewards: [
          { id: 'r1', name: '完赛奖牌（限定款）', type: 'points', mode: 'single', condition: 'contact', amount: 40 },
          { id: 'r2', name: '公益捐赠证书（电子版）', type: 'points', mode: 'single', condition: 'contact', amount: 60 },
          { id: 'r3', name: '荧光夜跑能量积分', type: 'points', mode: 'single', condition: 'none', amount: 30 },
        ],
      },
      promoTemplate: 'action',
      promoModules: [
        { type: 'cover', sort: 0, config: { subtitle: '5KM · 荧光之夜 · 为乡村儿童阅读而跑', bgImage: PIC('action-cover') } },
        { type: 'info', sort: 1, config: {} },
        { type: 'rich', sort: 2, config: { html: '<p><strong>这个夏天，把爱跑出去。</strong></p><p>每一位完赛者，我们都将以你的名义为「乡村儿童阅读计划」捐赠一本图书。你迈出的每一步，都在点亮一个孩子的世界。</p>' } },
        { type: 'images', sort: 3, config: { title: '往届夜跑高光', images: [PIC('action-1'), PIC('action-2'), PIC('action-3'), PIC('action-4')] } },
        { type: 'rewards', sort: 4, config: {} },
        { type: 'faq', sort: 5, config: { title: '活动须知', items: [
          { q: '跑不动 5KM 可以参加吗？', a: '可以，设 3KM 亲子休闲组与 5KM 竞速组，按需选择。' },
          { q: '现场提供装备吗？', a: '提供：荧光手环、反光背心、号码布与完赛补给。' },
          { q: '活动有保险吗？', a: '主办方为每位参与者投保活动意外险，请如实填写信息。' },
        ] } },
        { type: 'contact', sort: 6, config: {} },
        { type: 'message', sort: 7, config: {} },
      ],
      promoContact: {
        wechat: { qrcode: PIC('wechat-action'), id: 'joho_action' },
        phone: '13800004444',
        card: { name: '夜跑领队-阿坤', title: '公益项目负责人', company: 'JOHO 公益', phone: '13800004444', wechat: 'joho_action', avatar: PIC('card-action') },
        notice: '活动前一天发布集合定位与分组信息，请留意微信通知。',
      },
    },
  },

  {
    template: 'life',
    title: `${TITLE_PREFIX}手作咖啡品鉴课 · 慢生活`,
    activity: {
      type: '体验课',
      category: '工作坊',
      description: '一个下午，从豆子到杯中的完整旅程。认识不同产地的咖啡豆，亲手完成手冲、拉花，和一群有趣的人慢慢喝一杯好咖啡。',
      venueName: '成都桐梓林 · 巷尾咖啡馆',
      capacity: 24,
      pricingMode: 'flat',
      feeCollectAt: 'signup',
      pointsCost: 0,
      cashPrice: 0,
      status: 'signup_open',
      checkinMode: 'self',
      startTime: dt(35, 14, 0),
      endTime: dt(35, 16, 30),
      signupStart: nowIso(),
      signupEnd: dt(35, 14, 0),
      signupAdvanceHours: 0,
      formConfig: [
        { key: 'prefer', label: '咖啡偏好', type: 'select', required: false, options: ['手冲', '拿铁', '美式', '随便来一杯'] },
        { key: 'note', label: '忌口 / 备注', type: 'textarea', required: false, placeholder: '如：乳糖不耐受' },
        { key: 'contact_phone', label: '手机号', type: 'phone', required: true },
      ],
      rewardConfig: {
        loginEnabled: true,
        channel: { type: 'wechat_auth', label: '微信授权' },
        selectMode: 'any',
        selectN: 1,
        rewards: [
          { id: 'r1', name: '手冲课程讲义（含豆单）', type: 'points', mode: 'multi', condition: 'wechat_auth', amount: 50 },
          { id: 'r2', name: '精品咖啡豆伴手礼（200g）', type: 'points', mode: 'multi', condition: 'contact', amount: 70 },
          { id: 'r3', name: '慢生活能量积分', type: 'points', mode: 'single', condition: 'none', amount: 20 },
        ],
      },
      promoTemplate: 'life',
      promoModules: [
        { type: 'cover', sort: 0, config: { subtitle: '把日子过成一杯手冲的时间' } },
        { type: 'info', sort: 1, config: {} },
        { type: 'rich', sort: 2, config: { html: '<p><strong>关于「慢生活」</strong></p><p>我们希望用一个下午，让你暂时放下屏幕，专注在一杯咖啡的香气与温度里。零基础友好，所有器具与豆子由我们准备。</p>' } },
        { type: 'agenda', sort: 3, config: { title: '课程流程', items: [
          { t: '14:00', title: '咖啡入门小课堂', desc: '认识 6 种咖啡豆与烘焙度' },
          { t: '14:40', title: '手冲实操', desc: '老师手把手带你冲出第一杯' },
          { t: '15:30', title: '拉花初体验', desc: '绵密奶泡与小心形' },
          { t: '16:00', title: '下午茶自由时间', desc: '配甜点与同好聊天' },
        ] } },
        { type: 'images', sort: 4, config: { title: '往期作品', images: [PIC('life-1'), PIC('life-2'), PIC('life-3'), PIC('life-4')] } },
        { type: 'faq', sort: 5, config: { title: '常见问题', items: [
          { q: '完全零基础可以吗？', a: '可以，课程从零讲起，手把手教学。' },
          { q: '需要自带什么？', a: '什么都不用带，咖啡豆、器具、甜点都已备好。' },
          { q: '做完的咖啡可以带走吗？', a: '当场饮用最佳，也可打包带走。' },
        ] } },
        { type: 'rewards', sort: 6, config: {} },
        { type: 'contact', sort: 7, config: {} },
        { type: 'message', sort: 8, config: {} },
      ],
      promoContact: {
        wechat: { qrcode: PIC('wechat-life'), id: 'joho_life' },
        phone: '13800005555',
        card: { name: '咖啡馆主理-小满', title: '主理人 & 咖啡师', company: '巷尾咖啡馆', phone: '13800005555', wechat: 'joho_life', avatar: PIC('card-life') },
        notice: '报名后请添加微信，开课前一天拉群确认座位与偏好。',
      },
    },
  },
];

const LECTURERS = [
  { name: `${LECTURER_PREFIX}林致远`, desc: '增长战略顾问，前一线大厂增长负责人，操盘过 3 个亿级用户产品，专注公私域联动与会员体系。' },
  { name: `${LECTURER_PREFIX}苏晴`, desc: 'AI 应用专家，独立开发者，主攻企业级 AI 智能体落地，累计服务 200+ 中小企业提效改造。' },
  { name: `${LECTURER_PREFIX}陈默`, desc: '新媒体操盘手，7 年内容营销经验，孵化过 5 个百万粉账号，擅长内容生产线搭建。' },
  { name: `${LECTURER_PREFIX}周雨`, desc: '内容增长教练，前 MCN 机构运营总监，专注私域承接与投放放大，操盘 GMV 过亿。' },
];

const VENUES = [
  { name: `${VENUE_PREFIX}上海国际会议中心`, desc: '陆家嘴核心，配 500 人宴会厅', lat: 31.2397, lng: 121.4998 },
  { name: `${VENUE_PREFIX}运河书房`, desc: '杭州拱墅，小而美的分享空间', lat: 30.2741, lng: 120.1551 },
  { name: `${VENUE_PREFIX}知识产业园教室`, desc: '深圳南山，配投影与白板', lat: 22.5431, lng: 113.9308 },
];

async function main() {
  client = new Client(PG);
  await client.connect();

  const token = await waitForAdmin();
  if (!token) throw new Error('未能获取 admin token，请确认本地 Strapi 已运行');

  await purgeExisting();

  // 创建讲师与场地资源
  const lecturerIds = [];
  for (const l of LECTURERS) lecturerIds.push(await createLecturer(l.name, l.desc, token));
  const venueIds = [];
  for (const v of VENUES) venueIds.push(await createVenue(v.name, v.desc, v.lat, v.lng, token));
  out.push(`已创建讲师 ${lecturerIds.length} 位、场地 ${venueIds.length} 个`);

  // 创建 5 个演示活动
  for (let i = 0; i < PROMOS.length; i++) {
    const p = PROMOS[i];
    const body = {
      ...p.activity,
      title: p.title,
      lecturer: lecturerIds[i % lecturerIds.length],
      venue: venueIds[i % venueIds.length],
    };
    const created = await createActivity(body, token);
    out.push(`✔ [${p.template}] ${created.title} → documentId=${created.documentId}`);
    out.push(`    宣传页访问: /pages/activity/promo?act=${created.documentId}`);
  }

  await client.end();
  console.log(out.join('\n'));
  console.log('\n5 风格演示活动种子数据完成 ✅');
}

main().catch((e) => {
  console.error('种子脚本失败:', e.message);
  process.exit(1);
});
