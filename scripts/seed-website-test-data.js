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

// ============ 模块 1: site-config + channel ============

const SITES = [
  {
    docIdSeq: 1,
    siteName: '圣麟主站',
    domain: 'localhost',
    siteDescription: '圣麟主站 - 多租户官网平台演示',
    icpNumber: '沪ICP备2026000001号',
    seoKeywords: '多租户,官网平台,内容管理',
    customerServiceUrl: 'https://www.joho.cn',
    templateName: 'default',
    channelCode: 'test-official',
    channelName: '官方直营',
    channelTier: 'official',
    parentChannelCode: null,
  },
  {
    docIdSeq: 2,
    siteName: '昭易科技',
    domain: 'tenant-a.local',
    siteDescription: '昭易科技 - 企业官网演示',
    icpNumber: '沪ICP备2026000002号',
    seoKeywords: '企业官网,数字化转型',
    customerServiceUrl: 'https://www.joho.cn',
    templateName: 'coursera-blue',
    channelCode: 'test-regional',
    channelName: '华东大区',
    channelTier: 'regional',
    parentChannelCode: 'test-official',
  },
  {
    docIdSeq: 3,
    siteName: '智教云',
    domain: 'tenant-b.local',
    siteDescription: '智教云 - 教育机构官网演示',
    icpNumber: '沪ICP备2026000003号',
    seoKeywords: '教育官网,在线课程',
    customerServiceUrl: 'https://www.joho.cn',
    templateName: 'netease-red',
    channelCode: 'test-city',
    channelName: '上海分部',
    channelTier: 'city',
    parentChannelCode: 'test-regional',
  },
];

async function seedSites(knex) {
  console.log('[2/12] 插入 site-config + channel...');
  const siteIdMap = {}; // domain → numeric id
  const channelIdMap = {}; // channelCode → numeric id

  // 1. 查询 template 的 id
  const templates = await knex('zhao_site_templates').select('id', 'name');
  const templateIdMap = {};
  templates.forEach(t => { templateIdMap[t.name] = t.id; });

  // 2. 插入 site-config
  for (const s of SITES) {
    const docId = genDocId('testsite', s.docIdSeq);
    const templateId = templateIdMap[s.templateName] || null;
    const data = {
      document_id: docId,
      site_name: s.siteName,
      site_description: s.siteDescription,
      domain: s.domain,
      icp_number: s.icpNumber,
      seo_keywords: s.seoKeywords,
      customer_service_url: s.customerServiceUrl,
      template_id: templateId,
      channel_usage: 'site_cross_user',
      feature_flags: JSON.stringify({ sso: false, points: false, quiz: false, course: false, channel: true, thirdParty: false, oss: true }),
      theme_config: JSON.stringify({}),
      extra_config: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    };
    const id = await insertIfNotExists(knex, 'zhao_site_configs', data, docId);
    siteIdMap[s.domain] = id;
    console.log(`  - site-config: ${s.siteName} (${s.domain}) id=${id}`);
  }

  // 3. 插入 channel（含树形结构）
  for (const s of SITES) {
    const docId = genDocId('testch', s.docIdSeq);
    const parentId = s.parentChannelCode ? channelIdMap[s.parentChannelCode] : null;
    const data = {
      document_id: docId,
      name: s.channelName,
      code: s.channelCode,
      channel_tier: s.channelTier,
      parent_channel_id: parentId,
      status: true,
      depth: parentId ? 1 : 0,
      path: parentId ? `/test-official/${s.channelCode}` : `/${s.channelCode}`,
      extra_config: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    };
    const id = await insertIfNotExists(knex, 'zhao_channels', data, docId);
    channelIdMap[s.channelCode] = id;
    console.log(`  - channel: ${s.channelName} (${s.channelCode}) id=${id}`);
  }

  // 4. 关联 site-config ↔ channel（M2M join 表）
  for (const s of SITES) {
    const siteId = siteIdMap[s.domain];
    const channelId = channelIdMap[s.channelCode];
    const existing = await knex('zhao_channels_site_configs_lnk')
      .where({ site_config_id: siteId, channel_id: channelId }).first();
    if (!existing) {
      await knex('zhao_channels_site_configs_lnk').insert({
        site_config_id: siteId,
        channel_id: channelId,
        site_config_ord: 0,
        channel_ord: 0,
      });
    }
  }

  return { siteIdMap, channelIdMap };
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
      const { siteIdMap, channelIdMap } = await seedSites(knex);
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
