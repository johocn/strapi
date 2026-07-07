// 多租户网站测试数据种子脚本
// 用法：
//   node scripts/seed-website-test-data.js              # 插入测试数据
//   node scripts/seed-website-test-data.js --clean      # 清理测试数据
//   node scripts/seed-website-test-data.js --clean --seed  # 清理 + 插入
// 幂等性：document_id 固定前缀，重复执行跳过已存在记录
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ============ 工具函数 ============

// 生成固定 document_id（25 位，前缀 + 补 0）
function genDocId(prefix, seq) {
  const padded = String(seq).padStart(25 - prefix.length, '0');
  return (prefix + padded).slice(0, 25);
}

// 获取 knex 实例
function getKnex() {
  const client = process.env.DATABASE_CLIENT || 'postgres';
  if (client !== 'postgres') {
    console.log(`[SKIP] DATABASE_CLIENT=${client}, 仅支持 postgres`);
    process.exit(0);
  }
  return require('knex')({
    client: 'pg',
    connection: {
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      database: process.env.DATABASE_NAME || 'strapi',
      user: process.env.DATABASE_USERNAME || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'admin',
    },
  });
}

// 幂等插入：先查 document_id，不存在则插入
async function insertIfNotExists(knex, table, data, docId) {
  const existing = await knex(table).where('document_id', docId).first();
  if (existing) {
    return existing.id;
  }
  const inserted = await knex(table).insert(data).returning('id');
  return Array.isArray(inserted) ? (typeof inserted[0] === 'object' ? inserted[0].id : inserted[0]) : inserted;
}

// ============ 清理逻辑 ============

async function cleanTestData(knex) {
  console.log('[1/12] 清理测试数据...');

  // 清理顺序：反依赖序
  const cleanupSteps = [
    { table: 'zhao_website_interactions', where: { document_id: 'like', val: 'testint%' }, label: 'interaction' },
    { table: 'zhao_website_leads', where: { document_id: 'like', val: 'testlead%' }, label: 'lead' },
    { table: 'zhao_website_ai_summaries', where: { document_id: 'like', val: 'testai%' }, label: 'ai-summary' },
    { table: 'zhao_website_first_truths', where: { document_id: 'like', val: 'testft%' }, label: 'first-truth' },
    { table: 'zhao_website_knowledge_relations', where: { document_id: 'like', val: 'testkr%' }, label: 'knowledge-relation' },
    { table: 'zhao_website_knowledge_entities', where: { document_id: 'like', val: 'testke%' }, label: 'knowledge-entity' },
    { table: 'zhao_website_downloads', where: { document_id: 'like', val: 'testdl%' }, label: 'download' },
    { table: 'zhao_website_compliances', where: { document_id: 'like', val: 'testcp%' }, label: 'compliance' },
    { table: 'zhao_website_tutorials', where: { document_id: 'like', val: 'testtu%' }, label: 'tutorial' },
    { table: 'zhao_website_faqs', where: { document_id: 'like', val: 'testfaq%' }, label: 'faq' },
    { table: 'zhao_website_cases', where: { document_id: 'like', val: 'testcase%' }, label: 'case' },
    { table: 'zhao_website_products', where: { document_id: 'like', val: 'testprod%' }, label: 'product' },
    { table: 'zhao_website_articles', where: { document_id: 'like', val: 'testart%' }, label: 'article' },
    { table: 'zhao_website_article_categories', where: { document_id: 'like', val: 'testcat%' }, label: 'article-category' },
  ];

  for (const step of cleanupSteps) {
    const deleted = await knex(step.table).where('document_id', 'like', step.where.val).del();
    console.log(`  - 删除 ${step.label}: ${deleted} 条`);
  }

  // 清理 tag（testtag%）和 tag-group（slug LIKE 'test-%'）
  const deletedTags = await knex('zhao_tags').where('document_id', 'like', 'testtag%').del();
  console.log(`  - 删除 tag: ${deletedTags} 条`);
  // 先清理 join 表
  await knex('zhao_tags_tag_group_lnk').where('tag_group_id', 'in', function() {
    this.select('id').from('zhao_tag_groups').where('slug', 'like', 'test-%');
  }).del();
  const deletedTagGroups = await knex('zhao_tag_groups').where('slug', 'like', 'test-%').del();
  console.log(`  - 删除 tag-group: ${deletedTagGroups} 条`);

  // 清理 channel（code LIKE 'test-%'）和 site-config（testsite%）
  // 先清理 site_config ↔ channel join 表
  await knex('zhao_channels_site_configs_lnk').where('site_config_id', 'in', function() {
    this.select('id').from('zhao_site_configs').where('document_id', 'like', 'testsite%');
  }).del();
  await knex('zhao_channels_site_configs_lnk').where('channel_id', 'in', function() {
    this.select('id').from('zhao_channels').where('code', 'like', 'test-%');
  }).del();
  const deletedChannels = await knex('zhao_channels').where('code', 'like', 'test-%').del();
  console.log(`  - 删除 channel: ${deletedChannels} 条`);
  const deletedSites = await knex('zhao_site_configs').where('document_id', 'like', 'testsite%').del();
  console.log(`  - 删除 site-config: ${deletedSites} 条`);

  console.log('[DONE] 清理完成');
}

// ============ 主入口 ============

(async () => {
  const args = process.argv.slice(2);
  const isClean = args.includes('--clean');
  const isSeed = args.includes('--seed') || !isClean;

  const knex = getKnex();

  try {
    if (isClean) {
      await cleanTestData(knex);
    }
    if (isSeed) {
      console.log('\n[INFO] 开始插入测试数据...');
      // 各模块函数将在后续 Task 中实现
      // await seedSites(knex);
      // ...
      console.log('[DONE] 测试数据插入完成');
    }
  } catch (err) {
    console.error('[ERROR]', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await knex.destroy();
  }
})();
