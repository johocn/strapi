// 在地·剧本游《吉林·北山奇遇记》祈福寻乐版 —— 生产库 seed（幂等）
// 仅落库，不重建、不引入依赖；独立进程在 pm2 停止后运行
process.chdir('/www/apps/strapi');
const fs = require('fs');
const { createStrapi } = require('@strapi/strapi');

// 从 .env 读数据库参数，内联注入 config，绕过无法加载的 config/*.ts（config loader 只认 .js/.json）
function loadEnv(path) {
  const out = {};
  try {
    for (const line of fs.readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].trim();
    }
  } catch (_) {}
  return out;
}
const env = loadEnv('/www/apps/strapi/.env');
const sslBool = (v) => v === 'true' || v === '1';
const dbConfig = {
  connection: {
    client: env.DATABASE_CLIENT || 'postgres',
    connection: {
      host: env.DATABASE_HOST || '127.0.0.1',
      port: Number(env.DATABASE_PORT || 5432),
      database: env.DATABASE_NAME || 'strapi',
      user: env.DATABASE_USERNAME || 'strapi',
      password: env.DATABASE_PASSWORD,
      ssl: sslBool(env.DATABASE_SSL),
      schema: env.DATABASE_SCHEMA || 'public',
    },
    useNullAsDefault: true,
  },
};

const STORY_TITLE = '吉林·北山奇遇记';
const ACT_TITLE = '北山奇遇记·祈福寻乐首发团';

const STORY_DATA = {
  title: STORY_TITLE,
  lineTitle: '福气特种兵 · 北山祈福寻乐',
  backdrop:
    '北山是中国唯一一座佛、道及诸方传统共融的名山。相传山上七处福气被下了锁，一人解不开，得凑齐 7 条线索换一把钥匙——钥匙就藏在你们同行的几个人里。规则很简单：每完成一个任务→拿一条线索→线索指向下一个任务。全线上联机（群聊/弹幕/祈愿树），本山变成一场大型真人解密。',
  roles: [
    { id: 'star', name: '显眼包', desc: '口头禅“这福气我承包了！”·拉仇恨，能聚拢人群触发更多支线' },
    { id: 'buddy', name: '搭子', desc: '口头禅“兄弟，这波就靠你了”·组队双倍，和同行的连麦有加成' },
    { id: 'king', name: '欧皇', desc: '口头禅“我就随便一抽”·抽签/随机事件概率提高' },
    { id: 'lie', name: '躺赢王', desc: '口头禅“我负责躺你们负责赢”·坐着也运气爆棚，适合摸鱼搭子' },
  ],
  mainPuzzle:
    '7 条线索凑成你们这一队共同的祈愿陈词——独乐不如众乐，把每个人最想要的那个“福”拼成一句完整的祈愿（可不止四字）。答对与否由全队一起解，解出来的那一刻才算真的“一起完成”。',
  answer: '平安喜乐',
  hint:
    '钟声与药香、喊出口的真心话、陪队友杠赢的那几句……七个任务里藏着你想要的答案。若短路，问问祈愿树上的电子灯笼。',
  stationPoints: 10,
  mainPoints: 50,
  finalePoints: 100,
  guideName: '北山守山人',
};

const ACT_DATA = {
  title: ACT_TITLE,
  type: '旅行',
  category: '在地文化',
  description:
    '不是去庙里磕头，是去北山当一天“福气特种兵”。边玩边押下一句心意，跟同行搭子边玩边换到心坎里的福气，最后在祈愿树下一齐点亮，全员拿奖。',
  startTime: new Date('2026-09-12T09:00:00+08:00'),
  endTime: new Date('2026-09-12T12:30:00+08:00'),
  venueName: '吉林北山公园',
  capacity: 60,
  signupStart: new Date('2026-09-05T00:00:00+08:00'),
  signupEnd: new Date('2026-09-11T23:59:00+08:00'),
  status: 'signup_open',
  checkinMode: 'both',
  promoTemplate: 'summit',
  tourMode: true,
  itinerary: [
    { order: 1, name: '平安钟楼', clue: 'NPC喊你敲三下替你想护的人祈福，敲完把这句话当下发消息发给那人。完成后线索①：回声指向关帝庙那位“话多的大爷”。' },
    { order: 2, name: '关帝庙', clue: '遇到话多的大爷：不聊忠义，聊你们这代人最信啥。3个问题答错会被拌一嘴，杠赢他也能拿。多人一起更热闹。线索②：真相在药王庙的“加班药签”里。' },
    { order: 3, name: '药王庙', clue: '电子祈愿树旁的“加班打卡”：把祝福写在随机药签上（弹幕祈福墙），点赞够多才给“见效药”。线索③：见效药要对上泛雪堂那句没写完的话。' },
    { order: 4, name: '泛雪堂', clue: '组队对暗号：下联留白，你随口补一句最野的（不许正经），补齐+全员自拍才算过。线索④：玉皇阁的人在等一句真话。' },
    { order: 5, name: '玉皇阁', clue: '山顶坦白局：对着天地喊一句真心话（关于你到底求啥），线上弹幕应和才领“顺遂BUFF”。线索⑤：水火不沾，恰是坎离宫走心热身的答案。' },
    { order: 6, name: '坎离宫', clue: '走心热身：和水火对弈的小游戏，赢了解锁“转圜”福，只能和不同队的人组。线索⑥：最后一片拼图在揽月亭等你。' },
    { order: 7, name: '揽月亭', clue: '终局集合：全员凑齐7条线索拼成“集体祈愿”，一起点亮祈愿树。钥匙解锁终章兑奖。' },
  ],
};

(async () => {
  const app = createStrapi({ dir: '/www/apps/strapi' });
  app.config.set('database', dbConfig); // start 前注入 DB 配置，绕过 .ts config loader
  // 注入 server.app.keys（来自 .env APP_KEYS），绕开 config/server.ts 加载：strapi::session 中间件必需
  const appKeys = String(env.APP_KEYS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (appKeys.length) app.config.set('server', { app: { keys: appKeys } });
  // 注入 admin 需要的密钥，绕开 config/admin.ts 加载：auth.secret/apiToken.salt/transfer.token.salt
  if (env.ADMIN_JWT_SECRET) app.config.set('admin.auth.secret', env.ADMIN_JWT_SECRET);
  if (env.API_TOKEN_SALT) app.config.set('admin.apiToken.salt', env.API_TOKEN_SALT);
  if (env.TRANSFER_TOKEN_SALT) app.config.set('admin.transfer.token.salt', env.TRANSFER_TOKEN_SALT);
  if (env.ENCRYPTION_KEY) app.config.set('admin.encryptionKey', env.ENCRYPTION_KEY);
  // 注入 plugins 配置，绕开 config/plugins.ts 加载：插件目录内插件需显式 enabled+resolve 才会注册
  // 本 seed 只需 zhao-point（tour-story/activity）；其它插件不启用，避免多余启动开销
  app.config.set('plugins', {
    'zhao-point': { enabled: true, resolve: './plugins/zhao-point' },
  });
  try {
    await app.start();
    const doc = app.documents;
    const ctKeys = Object.keys(app.contentTypes || {}).filter((k) => k.startsWith('plugin::'));
    console.log('PLUGIN_CTS', JSON.stringify(ctKeys));
    console.log('HAS_TOUR_STORY', !!app.contentTypes['plugin::zhao-point.tour-story']);
    console.log('PLUGINS_KEYS', JSON.stringify(Object.keys(app.plugins || {})));
    let story = await doc('plugin::zhao-point.tour-story').findFirst({ filters: { title: STORY_TITLE } });
    if (!story) {
      story = await doc('plugin::zhao-point.tour-story').create({ data: STORY_DATA });
      console.log('STORY_CREATED ' + story.documentId);
    } else {
      console.log('STORY_EXISTS ' + story.documentId);
    }

    const act = await doc('plugin::zhao-point.activity').findFirst({ filters: { title: ACT_TITLE } });
    if (!act) {
      const created = await doc('plugin::zhao-point.activity').create({ data: { ...ACT_DATA, story: story.documentId } });
      console.log('ACT_CREATED ' + created.documentId);
    } else {
      console.log('ACT_EXISTS ' + act.documentId);
    }

    console.log('SEED_OK');
  } catch (e) {
    console.error('SEED_FAIL', e && e.message ? e.message : e);
    console.error((e && e.stack) || '');
    process.exitCode = 1;
  } finally {
    if (app) {
      try { await app.destroy(); } catch (_) {}
    }
  }
})();