// 活动分类种子：为 activity-category 分组补齐 8 个默认分类标签（幂等，raw-pg 轻量直连）
// 用法：在服务器 strapi 根目录执行  node scripts/seed-activity-categories.js
// 说明：内存占用极小（pg 直连，不起第二份 strapi），结构严格镜像 findOrCreate 产出
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const CATEGORIES = ['社会公益', '讲座', '沙龙', '工作坊', '培训', '读书会', '交流会', '其他'];
const GROUP_SLUG = 'activity-category';

const genDocId = () => {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 25; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
};

(async () => {
  if ((process.env.DATABASE_CLIENT || 'postgres') !== 'postgres') {
    console.log('[SKIP] DATABASE_CLIENT 非 postgres');
    process.exit(0);
  }
  const client = new Client({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: Number(process.env.DATABASE_PORT || 5432),
    database: process.env.DATABASE_NAME || 'strapi',
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || '',
  });
  await client.connect();
  try {
    const { rows: grps } = await client.query('SELECT id FROM zhao_tag_groups WHERE slug=$1', [GROUP_SLUG]);
    if (!grps.length) { console.error(`[ERR] 分组 ${GROUP_SLUG} 不存在`); process.exit(1); }
    const groupId = grps[0].id;

    // 组内已有标签名
    const { rows: links } = await client.query('SELECT tag_id FROM zhao_tags_tag_group_lnk WHERE tag_group_id=$1', [groupId]);
    let existingNames = [];
    if (links.length) {
      const ids = links.map((r) => r.tag_id);
      const { rows: tags } = await client.query('SELECT id, name FROM zhao_tags WHERE id = ANY($1)', [ids]);
      existingNames = tags.map((t) => t.name);
    }
    const existSet = new Set(existingNames);

    const now = new Date();
    let created = 0, skipped = 0, ord = existingNames.length;
    for (const name of CATEGORIES) {
      if (existSet.has(name)) {
        console.log(`[SKIP] 已存在同名分类: ${name}`);
        skipped++;
        continue;
      }
      const { rows: ins } = await client.query(
        `INSERT INTO zhao_tags
          (document_id, name, slug, description, color, sort, is_preset, is_public,
           deleted_at, created_at, updated_at, published_at, created_by_id, updated_by_id, locale)
         VALUES ($1,$2,NULL,NULL,NULL,0,$3,true,NULL,$4,$4,$4,NULL,NULL,'en')
         RETURNING id`,
        [genDocId(), name, false, now]
      );
      const tagId = ins[0].id;
      await client.query(
        'INSERT INTO zhao_tags_tag_group_lnk (tag_id, tag_group_id, tag_ord) VALUES ($1,$2,$3)',
        [tagId, groupId, ++ord]
      );
      console.log(`[OK] 新建分类标签: ${name} (tag_id=${tagId}, group=${groupId})`);
      created++;
    }
    console.log(`\n[DONE] activity-category 分类种子完成: 新建 ${created}, 跳过 ${skipped}`);
  } finally {
    await client.end();
  }
})().catch((e) => { console.error('[ERROR]', e); process.exit(1); });