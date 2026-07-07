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

// ============ 模块 2: article-category ============

const CATEGORIES = [
  // 圣麟主站 (localhost)
  { siteDomain: 'localhost', name: '产品动态', slug: 'main-product-news', seq: 1 },
  { siteDomain: 'localhost', name: '行业洞察', slug: 'main-industry-insights', seq: 2 },
  { siteDomain: 'localhost', name: '客户故事', slug: 'main-customer-stories', seq: 3 },
  { siteDomain: 'localhost', name: '产品教程', slug: 'main-product-tutorials', seq: 4 },
  { siteDomain: 'localhost', name: '公告通知', slug: 'main-announcements', seq: 5 },
  // 昭易科技 (tenant-a.local)
  { siteDomain: 'tenant-a.local', name: '解决方案', slug: 'a-solutions', seq: 6 },
  { siteDomain: 'tenant-a.local', name: '技术分享', slug: 'a-tech-sharing', seq: 7 },
  { siteDomain: 'tenant-a.local', name: '客户案例', slug: 'a-customer-cases', seq: 8 },
  { siteDomain: 'tenant-a.local', name: '使用指南', slug: 'a-user-guides', seq: 9 },
  { siteDomain: 'tenant-a.local', name: '公司新闻', slug: 'a-company-news', seq: 10 },
  // 智教云 (tenant-b.local)
  { siteDomain: 'tenant-b.local', name: '课程资讯', slug: 'b-course-news', seq: 11 },
  { siteDomain: 'tenant-b.local', name: '学习心得', slug: 'b-learning-insights', seq: 12 },
  { siteDomain: 'tenant-b.local', name: '教学案例', slug: 'b-teaching-cases', seq: 13 },
  { siteDomain: 'tenant-b.local', name: '操作手册', slug: 'b-operation-manuals', seq: 14 },
  { siteDomain: 'tenant-b.local', name: '平台公告', slug: 'b-platform-announcements', seq: 15 },
];

async function seedCategories(knex, siteIdMap) {
  console.log('[3/12] 插入 article-category...');
  const categoryIdMap = {}; // slug → numeric id

  for (const c of CATEGORIES) {
    const docId = genDocId('testcat', c.seq);
    const siteId = siteIdMap[c.siteDomain];
    const data = {
      document_id: docId,
      site_id: siteId,
      name: c.name,
      slug: c.slug,
      description: `${c.name} 分类`,
      order: c.seq,
      status: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
    const id = await insertIfNotExists(knex, 'zhao_website_article_categories', data, docId);
    categoryIdMap[c.slug] = id;
  }
  console.log(`  - 插入 article-category: ${CATEGORIES.length} 条`);
  return categoryIdMap;
}

// ============ 模块 3: tag + tag-group ============

const TAG_GROUPS = [
  { name: '测试-产品类', slug: 'test-product-tags', description: '产品相关标签（测试）', seq: 1 },
  { name: '测试-行业类', slug: 'test-industry-tags', description: '行业相关标签（测试）', seq: 2 },
  { name: '测试-功能类', slug: 'test-feature-tags', description: '功能相关标签（测试）', seq: 3 },
];

const TAGS = [
  // 产品类
  { name: '多租户', slug: 'test-duozuhu', group: '测试-产品类', seq: 1 },
  { name: 'SSR', slug: 'test-ssr', group: '测试-产品类', seq: 2 },
  { name: 'SEO优化', slug: 'test-seo', group: '测试-产品类', seq: 3 },
  { name: '内容管理', slug: 'test-cms', group: '测试-产品类', seq: 4 },
  { name: '模板系统', slug: 'test-template', group: '测试-产品类', seq: 5 },
  // 行业类
  { name: '企业服务', slug: 'test-enterprise', group: '测试-行业类', seq: 6 },
  { name: 'SaaS', slug: 'test-saas', group: '测试-行业类', seq: 7 },
  { name: 'B2B', slug: 'test-b2b', group: '测试-行业类', seq: 8 },
  { name: '数字化转型', slug: 'test-digital', group: '测试-行业类', seq: 9 },
  { name: '教育科技', slug: 'test-edutech', group: '测试-行业类', seq: 10 },
  // 功能类
  { name: '知识图谱', slug: 'test-kg', group: '测试-功能类', seq: 11 },
  { name: '真值管理', slug: 'test-truth', group: '测试-功能类', seq: 12 },
  { name: 'AI摘要', slug: 'test-aisummary', group: '测试-功能类', seq: 13 },
  { name: 'Studio Bridge', slug: 'test-studio', group: '测试-功能类', seq: 14 },
  { name: '留资转化', slug: 'test-lead', group: '测试-功能类', seq: 15 },
];

async function seedTags(knex) {
  console.log('[4/12] 插入 tag + tag-group...');
  const tagIdMap = {}; // tag name → numeric id
  const tagGroupIdMap = {}; // group name → numeric id

  // 1. 插入 tag-group
  for (const g of TAG_GROUPS) {
    const existing = await knex('zhao_tag_groups').where('slug', g.slug).first();
    let id;
    if (existing) {
      id = existing.id;
    } else {
      const docId = genDocId('testtg', g.seq);
      const inserted = await knex('zhao_tag_groups').insert({
        document_id: docId,
        name: g.name,
        slug: g.slug,
        description: g.description,
        sort: g.seq,
        created_at: new Date(),
        updated_at: new Date(),
      }).returning('id');
      id = Array.isArray(inserted) ? (typeof inserted[0] === 'object' ? inserted[0].id : inserted[0]) : inserted;
    }
    tagGroupIdMap[g.name] = id;
  }
  console.log(`  - 插入 tag-group: ${TAG_GROUPS.length} 条`);

  // 2. 插入 tag
  for (const t of TAGS) {
    const docId = genDocId('testtag', t.seq);
    const data = {
      document_id: docId,
      name: t.name,
      slug: t.slug,
      description: `${t.name} 标签（测试）`,
      sort: t.seq,
      is_preset: false,
      is_public: true,
      tag_group_id: tagGroupIdMap[t.group],
      created_at: new Date(),
      updated_at: new Date(),
    };
    const id = await insertIfNotExists(knex, 'zhao_tags', data, docId);
    tagIdMap[t.name] = id;
  }
  console.log(`  - 插入 tag: ${TAGS.length} 条`);

  return tagIdMap;
}

// ============ 模块 4: article ============

const ARTICLES = [
  // 圣麟主站 (localhost) - 3 published + 1 draft + 1 archived
  { siteDomain: 'localhost', seq: 1, title: '多租户架构设计：一套代码支撑 100+ 官网', slug: 'test-art-1', category: 'main-product-news', tags: ['多租户', 'SSR', '内容管理'], status: 'published', isFeatured: true, author: '技术团队', excerpt: '深入解析多租户架构设计', content: '<p>多租户架构是企业级 SaaS 平台的核心能力...</p>', readingTime: 8 },
  { siteDomain: 'localhost', seq: 2, title: 'SSR + 同域反代：SEO 最优解', slug: 'test-art-2', category: 'main-industry-insights', tags: ['SSR', 'SEO优化'], status: 'published', isFeatured: false, author: '技术团队', excerpt: 'SSR 与 SPA 的 SEO 差异', content: '<p>企业官网的 SEO 是核心能力...</p>', readingTime: 6 },
  { siteDomain: 'localhost', seq: 3, title: '模板系统演进：从代码到配置', slug: 'test-art-3', category: 'main-product-news', tags: ['模板系统', '内容管理'], status: 'published', isFeatured: false, author: '产品团队', excerpt: '模板系统的渐进式设计', content: '<p>模板系统平衡灵活性与复杂度...</p>', readingTime: 7 },
  { siteDomain: 'localhost', seq: 4, title: '知识图谱 + 真值管理实战', slug: 'test-art-4', category: 'main-product-news', tags: ['知识图谱', '真值管理', 'AI摘要'], status: 'draft', isFeatured: false, author: '产品团队', excerpt: '让 AI 理解你的内容', content: '<p>大模型时代，结构化知识至关重要...</p>', readingTime: 9 },
  { siteDomain: 'localhost', seq: 5, title: 'Studio Bridge 一键发布闭环', slug: 'test-art-5', category: 'main-product-tutorials', tags: ['Studio Bridge', '内容管理'], status: 'archived', isFeatured: false, author: '产品团队', excerpt: '草稿到官网一键发布', content: '<p>内容生产流程效率优化...</p>', readingTime: 5 },
  // 昭易科技 (tenant-a.local)
  { siteDomain: 'tenant-a.local', seq: 6, title: '企业官网数字化转型指南', slug: 'test-art-6', category: 'a-solutions', tags: ['企业服务', '数字化转型'], status: 'published', isFeatured: true, author: '昭易团队', excerpt: '企业官网如何数字化', content: '<p>数字化转型是企业必经之路...</p>', readingTime: 8 },
  { siteDomain: 'tenant-a.local', seq: 7, title: 'B2B 内容营销策略', slug: 'test-art-7', category: 'a-company-news', tags: ['B2B', '企业服务'], status: 'published', isFeatured: false, author: '昭易团队', excerpt: 'B2B 内容营销方法', content: '<p>B2B 内容营销的核心是信任...</p>', readingTime: 6 },
  { siteDomain: 'tenant-a.local', seq: 8, title: '多渠道获客方法', slug: 'test-art-8', category: 'a-solutions', tags: ['企业服务', '数字化转型'], status: 'published', isFeatured: false, author: '昭易团队', excerpt: '多渠道获客实践', content: '<p>获客渠道的多样化策略...</p>', readingTime: 7 },
  { siteDomain: 'tenant-a.local', seq: 9, title: '官网性能优化实践', slug: 'test-art-9', category: 'a-tech-sharing', tags: ['SSR', 'SEO优化'], status: 'draft', isFeatured: false, author: '昭易团队', excerpt: '性能优化方法', content: '<p>官网性能影响用户体验和 SEO...</p>', readingTime: 5 },
  { siteDomain: 'tenant-a.local', seq: 10, title: 'SEO 收录加速技巧', slug: 'test-art-10', category: 'a-tech-sharing', tags: ['SEO优化'], status: 'archived', isFeatured: false, author: '昭易团队', excerpt: 'SEO 收录加速', content: '<p>加速搜索引擎收录的技巧...</p>', readingTime: 4 },
  // 智教云 (tenant-b.local)
  { siteDomain: 'tenant-b.local', seq: 11, title: '教育机构官网建设指南', slug: 'test-art-11', category: 'b-course-news', tags: ['教育科技', '内容管理'], status: 'published', isFeatured: true, author: '智教团队', excerpt: '教育机构官网如何建', content: '<p>教育机构官网的核心需求...</p>', readingTime: 8 },
  { siteDomain: 'tenant-b.local', seq: 12, title: '在线课程展示技巧', slug: 'test-art-12', category: 'b-course-news', tags: ['教育科技'], status: 'published', isFeatured: false, author: '智教团队', excerpt: '课程展示优化', content: '<p>课程展示影响转化率...</p>', readingTime: 6 },
  { siteDomain: 'tenant-b.local', seq: 13, title: '招生转化提升方法', slug: 'test-art-13', category: 'b-teaching-cases', tags: ['教育科技', '留资转化'], status: 'published', isFeatured: false, author: '智教团队', excerpt: '招生转化策略', content: '<p>招生转化的关键因素...</p>', readingTime: 7 },
  { siteDomain: 'tenant-b.local', seq: 14, title: '学习社区运营经验', slug: 'test-art-14', category: 'b-learning-insights', tags: ['教育科技'], status: 'draft', isFeatured: false, author: '智教团队', excerpt: '社区运营方法', content: '<p>学习社区提升用户粘性...</p>', readingTime: 5 },
  { siteDomain: 'tenant-b.local', seq: 15, title: '教学案例分享', slug: 'test-art-15', category: 'b-teaching-cases', tags: ['教育科技'], status: 'archived', isFeatured: false, author: '智教团队', excerpt: '教学案例', content: '<p>教学案例的分享价值...</p>', readingTime: 4 },
];

async function seedArticles(knex, siteIdMap, categoryIdMap, tagIdMap) {
  console.log('[5/12] 插入 article...');
  const articleIdMap = {}; // slug → numeric id
  const now = new Date();
  const publishedDate = new Date('2026-07-01');

  for (const a of ARTICLES) {
    const docId = genDocId('testart', a.seq);
    const siteId = siteIdMap[a.siteDomain];
    const categoryId = categoryIdMap[a.category];
    const data = {
      document_id: docId,
      site_id: siteId,
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt,
      content: a.content,
      category_id: categoryId,
      author: a.author,
      is_featured: a.isFeatured,
      reading_time: a.readingTime,
      word_count: a.content.length,
      view_count: Math.floor(Math.random() * 1000) + 100,
      like_count: Math.floor(Math.random() * 50),
      allow_index: true,
      sitemap_priority: 0.7,
      sitemap_frequency: 'weekly',
      source_type: 'original',
      status: a.status,
      published_at: a.status === 'published' ? publishedDate : null,
      deleted_at: a.status === 'archived' ? now : null,
      created_at: now,
      updated_at: now,
    };
    const id = await insertIfNotExists(knex, 'zhao_website_articles', data, docId);
    articleIdMap[a.slug] = id;

    // 插入 tags 关联（join 表 zhao_website_articles_tags_lnk）
    for (const tagName of a.tags) {
      const tagId = tagIdMap[tagName];
      if (tagId) {
        const existing = await knex('zhao_website_articles_tags_lnk')
          .where({ article_id: id, tag_id: tagId }).first();
        if (!existing) {
          await knex('zhao_website_articles_tags_lnk').insert({
            article_id: id,
            tag_id: tagId,
            tag_ord: 0,
          });
        }
      }
    }
  }
  console.log(`  - 插入 article: ${ARTICLES.length} 条`);
  return articleIdMap;
}

// ============ 模块 5: product ============

const PRODUCTS = [
  { siteDomain: 'localhost', seq: 1, name: '交互官网平台', slug: 'test-prod-1', tagline: '多租户官网平台', category: 'main-product-news', tags: ['多租户', 'SSR', '内容管理'], isFeatured: true, status: 'published', description: '<p>交互官网平台是企业级官网建设解决方案...</p>', features: JSON.stringify(['多租户隔离', 'SSR 渲染', '模板系统']), specifications: JSON.stringify({ techStack: 'Strapi v5 + Nuxt 3' }), scenarios: JSON.stringify([{ name: '企业官网', desc: 'B2B 品牌展示' }]), priceRange: '联系咨询' },
  { siteDomain: 'tenant-a.local', seq: 2, name: '企业 CMS 系统', slug: 'test-prod-2', tagline: '企业内容管理', category: 'a-solutions', tags: ['内容管理', '企业服务'], isFeatured: false, status: 'published', description: '<p>企业 CMS 系统帮助企业管理内容...</p>', features: JSON.stringify(['内容编辑', '权限管理', '多站点']), specifications: JSON.stringify({ techStack: 'Strapi v5' }), scenarios: JSON.stringify([{ name: '企业内部', desc: '知识库管理' }]), priceRange: '5万起' },
  { siteDomain: 'tenant-b.local', seq: 3, name: '在线教育平台', slug: 'test-prod-3', tagline: '教育机构专属', category: 'b-course-news', tags: ['教育科技', '内容管理'], isFeatured: true, status: 'published', description: '<p>在线教育平台面向教育机构...</p>', features: JSON.stringify(['课程管理', '学员管理', '直播']), specifications: JSON.stringify({ techStack: 'Strapi + uni-app' }), scenarios: JSON.stringify([{ name: '培训机构', desc: '在线课程销售' }]), priceRange: '3万起' },
  { siteDomain: 'tenant-b.local', seq: 4, name: '课程商城', slug: 'test-prod-4', tagline: '课程电商', category: 'b-course-news', tags: ['教育科技', 'B2B'], isFeatured: false, status: 'draft', description: '<p>课程商城支持在线售卖课程...</p>', features: JSON.stringify(['购物车', '支付', '订单']), specifications: JSON.stringify({ techStack: 'uni-app' }), scenarios: JSON.stringify([{ name: '教育电商', desc: '课程零售' }]), priceRange: '2万起' },
];

async function seedProducts(knex, siteIdMap, categoryIdMap, tagIdMap) {
  console.log('[6/12] 插入 product...');
  const productIdMap = {}; // slug → numeric id
  const now = new Date();
  const publishedDate = new Date('2026-07-01');

  for (const p of PRODUCTS) {
    const docId = genDocId('testprod', p.seq);
    const siteId = siteIdMap[p.siteDomain];
    const categoryId = categoryIdMap[p.category];
    const data = {
      document_id: docId,
      site_id: siteId,
      name: p.name,
      slug: p.slug,
      tagline: p.tagline,
      description: p.description,
      category_id: categoryId,
      is_featured: p.isFeatured,
      features: p.features,
      specifications: p.specifications,
      scenarios: p.scenarios,
      price_range: p.priceRange,
      view_count: Math.floor(Math.random() * 500) + 50,
      allow_index: true,
      status: p.status,
      published_at: p.status === 'published' ? publishedDate : null,
      created_at: now,
      updated_at: now,
    };
    const id = await insertIfNotExists(knex, 'zhao_website_products', data, docId);
    productIdMap[p.slug] = id;

    // tags 关联（join 表 zhao_website_products_tags_lnk）
    for (const tagName of p.tags) {
      const tagId = tagIdMap[tagName];
      if (tagId) {
        const existing = await knex('zhao_website_products_tags_lnk')
          .where({ product_id: id, tag_id: tagId }).first();
        if (!existing) {
          await knex('zhao_website_products_tags_lnk').insert({
            product_id: id,
            tag_id: tagId,
            tag_ord: 0,
          });
        }
      }
    }
  }
  console.log(`  - 插入 product: ${PRODUCTS.length} 条`);
  return productIdMap;
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
      const categoryIdMap = await seedCategories(knex, siteIdMap);
      const tagIdMap = await seedTags(knex);
      const articleIdMap = await seedArticles(knex, siteIdMap, categoryIdMap, tagIdMap);
      const productIdMap = await seedProducts(knex, siteIdMap, categoryIdMap, tagIdMap);
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
