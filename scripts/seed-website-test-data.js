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

// ============ 模块 6: case ============

const CASES = [
  { siteDomain: 'localhost', seq: 1, title: '某制造业集团官网矩阵建设', slug: 'test-case-1', clientName: '某制造业集团', clientIndustry: '制造业', challenge: '<p>20+ 子品牌官网各自维护...</p>', solution: '<p>采用多租户架构统一管理...</p>', results: JSON.stringify([{ metric: '建站效率', value: '提升 80%' }, { metric: '运维成本', value: '降低 60%' }]), testimonial: '2 个月内全部上线', testimonialAuthor: '张总监', testimonialTitle: '数字化负责人', tags: ['多租户', '企业服务'], relatedProducts: ['test-prod-1'], isFeatured: true, status: 'published' },
  { siteDomain: 'localhost', seq: 2, title: '某 SaaS 公司品牌升级', slug: 'test-case-2', clientName: '某 SaaS 公司', clientIndustry: 'SaaS', challenge: '<p>品牌形象老旧...</p>', solution: '<p>全新官网 + 品牌升级...</p>', results: JSON.stringify([{ metric: '访问量', value: '提升 200%' }]), testimonial: '品牌形象焕然一新', testimonialAuthor: '李总', testimonialTitle: '市场总监', tags: ['企业服务', '数字化转型'], relatedProducts: ['test-prod-1'], isFeatured: false, status: 'published' },
  { siteDomain: 'tenant-a.local', seq: 3, title: '某零售企业数字化转型', slug: 'test-case-3', clientName: '某零售企业', clientIndustry: '零售', challenge: '<p>线下门店为主...</p>', solution: '<p>线上线下融合...</p>', results: JSON.stringify([{ metric: '线上销售', value: '提升 150%' }]), testimonial: '数字化转型成功', testimonialAuthor: '王总', testimonialTitle: '运营总监', tags: ['企业服务', '数字化转型'], relatedProducts: ['test-prod-2'], isFeatured: false, status: 'published' },
  { siteDomain: 'tenant-a.local', seq: 4, title: '某金融机构官网重构', slug: 'test-case-4', clientName: '某金融机构', clientIndustry: '金融', challenge: '<p>官网老旧不安全...</p>', solution: '<p>安全重构 + 性能优化...</p>', results: JSON.stringify([{ metric: '安全性', value: '等保三级' }]), testimonial: '安全可靠', testimonialAuthor: '赵总', testimonialTitle: 'IT 负责人', tags: ['企业服务'], relatedProducts: ['test-prod-2'], isFeatured: false, status: 'published' },
  { siteDomain: 'tenant-b.local', seq: 5, title: '某教育机构招生官网', slug: 'test-case-5', clientName: '某教育机构', clientIndustry: '教育', challenge: '<p>招生渠道单一...</p>', solution: '<p>官网 + 留资 + 课程展示...</p>', results: JSON.stringify([{ metric: '招生转化', value: '提升 120%' }]), testimonial: '招生量翻倍', testimonialAuthor: '孙校长', testimonialTitle: '校长', tags: ['教育科技', '留资转化'], relatedProducts: ['test-prod-3'], isFeatured: true, status: 'published' },
  { siteDomain: 'tenant-b.local', seq: 6, title: '某培训学校在线商城', slug: 'test-case-6', clientName: '某培训学校', clientIndustry: '教育', challenge: '<p>课程销售线下为主...</p>', solution: '<p>在线课程商城...</p>', results: JSON.stringify([{ metric: '线上收入', value: '提升 80%' }]), testimonial: '线上收入大幅增长', testimonialAuthor: '周校长', testimonialTitle: '校长', tags: ['教育科技'], relatedProducts: ['test-prod-4'], isFeatured: false, status: 'published' },
  { siteDomain: 'tenant-b.local', seq: 7, title: '某大学门户建设', slug: 'test-case-7', clientName: '某大学', clientIndustry: '教育', challenge: '<p>信息分散...</p>', solution: '<p>统一门户 + 多院系子站...</p>', results: JSON.stringify([{ metric: '信息整合', value: '100%' }]), testimonial: '门户建设成功', testimonialAuthor: '吴主任', testimonialTitle: '信息中心主任', tags: ['教育科技', '多租户'], relatedProducts: ['test-prod-3'], isFeatured: false, status: 'archived' },
];

async function seedCases(knex, siteIdMap, tagIdMap, productIdMap) {
  console.log('[7/12] 插入 case...');
  const now = new Date();
  const publishedDate = new Date('2026-07-01');

  for (const c of CASES) {
    const docId = genDocId('testcase', c.seq);
    const siteId = siteIdMap[c.siteDomain];
    const data = {
      document_id: docId,
      site_id: siteId,
      title: c.title,
      slug: c.slug,
      client_name: c.clientName,
      client_industry: c.clientIndustry,
      challenge: c.challenge,
      solution: c.solution,
      results: c.results,
      testimonial: c.testimonial,
      testimonial_author: c.testimonialAuthor,
      testimonial_title: c.testimonialTitle,
      is_featured: c.isFeatured,
      view_count: Math.floor(Math.random() * 300) + 50,
      allow_index: true,
      status: c.status,
      published_at: c.status === 'published' ? publishedDate : null,
      deleted_at: c.status === 'archived' ? now : null,
      created_at: now,
      updated_at: now,
    };
    const id = await insertIfNotExists(knex, 'zhao_website_cases', data, docId);

    // tags 关联
    for (const tagName of c.tags) {
      const tagId = tagIdMap[tagName];
      if (tagId) {
        const existing = await knex('zhao_website_cases_tags_lnk')
          .where({ case_id: id, tag_id: tagId }).first();
        if (!existing) {
          await knex('zhao_website_cases_tags_lnk').insert({ case_id: id, tag_id: tagId, tag_ord: 0 });
        }
      }
    }

    // relatedProducts 关联
    for (const prodSlug of c.relatedProducts) {
      const prodId = productIdMap[prodSlug];
      if (prodId) {
        const existing = await knex('zhao_website_cases_products_lnk')
          .where({ case_id: id, product_id: prodId }).first();
        if (!existing) {
          await knex('zhao_website_cases_products_lnk').insert({ case_id: id, product_id: prodId, product_ord: 0 });
        }
      }
    }
  }
  console.log(`  - 插入 case: ${CASES.length} 条`);
}

// ============ 模块 7: faq + tutorial + compliance + download ============

const FAQS = [
  // 圣麟主站
  { siteDomain: 'localhost', seq: 1, question: '交互官网平台支持多少个租户？', answer: '单实例支撑 100+ 租户站点。', order: 1, isFeatured: true, category: 'main-product-news', status: 'published' },
  { siteDomain: 'localhost', seq: 2, question: '如何配置自定义域名？', answer: '三步完成：DNS CNAME + site-config.domain + Nginx server_name。', order: 2, isFeatured: true, category: 'main-product-tutorials', status: 'published' },
  { siteDomain: 'localhost', seq: 3, question: '是否支持多语言？', answer: '首期单语言，架构已预留 i18n 扩展点。', order: 3, isFeatured: false, category: 'main-product-news', status: 'published' },
  { siteDomain: 'localhost', seq: 4, question: 'SEO 效果如何保证？', answer: 'SSR + useSeoMeta + sitemap + JSON-LD 四重保障。', order: 4, isFeatured: true, category: 'main-industry-insights', status: 'published' },
  { siteDomain: 'localhost', seq: 5, question: '内容发布流程是什么？', answer: 'draft → published → archived 三态流转。', order: 5, isFeatured: false, category: 'main-product-tutorials', status: 'published' },
  // 昭易科技
  { siteDomain: 'tenant-a.local', seq: 6, question: '是否支持私有化部署？', answer: '支持 Docker Compose 一键部署。', order: 1, isFeatured: true, category: 'a-solutions', status: 'published' },
  { siteDomain: 'tenant-a.local', seq: 7, question: '与 Strapi 原生有什么增强？', answer: '多租户 + 7 业务 CT + 知识图谱 + AI 摘要 + Studio Bridge。', order: 2, isFeatured: true, category: 'a-solutions', status: 'published' },
  { siteDomain: 'tenant-a.local', seq: 8, question: '如何对接 CRM？', answer: '通过留资 API + webhook 推送。', order: 3, isFeatured: false, category: 'a-user-guides', status: 'published' },
  { siteDomain: 'tenant-a.local', seq: 9, question: '支持哪些数据库？', answer: 'PostgreSQL/MySQL/SQLite。', order: 4, isFeatured: false, category: 'a-tech-sharing', status: 'published' },
  { siteDomain: 'tenant-a.local', seq: 10, question: '如何备份？', answer: 'mysqldump/pgdump + uploads 目录 + .env。', order: 5, isFeatured: false, category: 'a-user-guides', status: 'published' },
  // 智教云
  { siteDomain: 'tenant-b.local', seq: 11, question: '支持在线支付吗？', answer: '支持微信/支付宝支付。', order: 1, isFeatured: true, category: 'b-course-news', status: 'published' },
  { siteDomain: 'tenant-b.local', seq: 12, question: '课程如何管理？', answer: '通过课程 CT + 课时 CT 管理。', order: 2, isFeatured: true, category: 'b-operation-manuals', status: 'published' },
  { siteDomain: 'tenant-b.local', seq: 13, question: '学员如何注册？', answer: '支持手机号/微信注册。', order: 3, isFeatured: false, category: 'b-operation-manuals', status: 'published' },
  { siteDomain: 'tenant-b.local', seq: 14, question: '支持直播吗？', answer: '支持接入第三方直播服务。', order: 4, isFeatured: false, category: 'b-course-news', status: 'published' },
  { siteDomain: 'tenant-b.local', seq: 15, question: '如何查看学习进度？', answer: '学员中心有进度统计。', order: 5, isFeatured: false, category: 'b-learning-insights', status: 'published' },
];

async function seedFaqs(knex, siteIdMap, categoryIdMap) {
  console.log('[8/12] 插入 faq...');
  const now = new Date();
  const publishedDate = new Date('2026-07-01');

  for (const f of FAQS) {
    const docId = genDocId('testfaq', f.seq);
    const siteId = siteIdMap[f.siteDomain];
    const categoryId = categoryIdMap[f.category];
    const data = {
      document_id: docId,
      site_id: siteId,
      question: f.question,
      answer: f.answer,
      slug: `test-faq-${f.seq}`,
      order: f.order,
      is_featured: f.isFeatured,
      category_id: categoryId,
      view_count: Math.floor(Math.random() * 200) + 20,
      status: f.status,
      published_at: publishedDate,
      created_at: now,
      updated_at: now,
    };
    await insertIfNotExists(knex, 'zhao_website_faqs', data, docId);
  }
  console.log(`  - 插入 faq: ${FAQS.length} 条`);
}

const TUTORIALS = [
  { siteDomain: 'localhost', seq: 1, title: '5 分钟搭建第一个官网站点', slug: 'test-tu-1', difficulty: 'beginner', estimatedTime: '5 分钟', category: 'main-product-tutorials', tags: ['多租户', '内容管理'], isFeatured: true, status: 'published', description: '从零搭建官网站点', steps: JSON.stringify([{ title: '启动 Strapi', content: 'npm run develop' }, { title: '配置 site-config', content: '编辑默认 site-config' }, { title: '启动 dsite', content: 'npm run dev' }]), materials: JSON.stringify([{ name: 'Node.js 20+', desc: '运行时' }]), result: '访问 localhost:3000 看到首页' },
  { siteDomain: 'localhost', seq: 2, title: '多租户配置完整流程', slug: 'test-tu-2', difficulty: 'intermediate', estimatedTime: '30 分钟', category: 'main-product-tutorials', tags: ['多租户', '企业服务'], isFeatured: false, status: 'published', description: '多租户配置指南', steps: JSON.stringify([{ title: '创建 site-template', content: '配置模板' }, { title: '创建 site-config', content: '配置租户' }, { title: '创建 channel', content: '配置渠道' }, { title: '关联', content: '关联 channel 到 site-config' }, { title: '配置 DNS', content: 'CNAME 指向' }, { title: '验证', content: '访问域名' }]), materials: JSON.stringify([{ name: '域名', desc: '租户域名' }]), result: '租户专属站点可访问' },
  { siteDomain: 'localhost', seq: 3, title: '自定义模板开发指南', slug: 'test-tu-3', difficulty: 'advanced', estimatedTime: '2 小时', category: 'main-product-tutorials', tags: ['模板系统', '内容管理'], isFeatured: true, status: 'published', description: '自定义模板开发', steps: JSON.stringify([{ title: '创建模板文件', content: 'layouts/templates/<name>.vue' }, { title: '编排 sections', content: '组合 components/sections/*' }, { title: '创建主题样式', content: 'assets/css/themes/<name>.css' }, { title: '注册主题', content: 'nuxt.config.ts css 数组' }, { title: '更新入口', content: 'layouts/default.vue v-if 分支' }, { title: '创建 site-template', content: 'Strapi 后台新建记录' }, { title: '绑定 site-config', content: '关联 template' }, { title: '验证', content: '访问站点确认' }]), materials: JSON.stringify([{ name: 'dsite 源码', desc: '前端代码' }]), result: '新模板布局生效' },
  { siteDomain: 'tenant-a.local', seq: 4, title: 'API 集成指南', slug: 'test-tu-4', difficulty: 'advanced', estimatedTime: '1.5 小时', category: 'a-tech-sharing', tags: ['企业服务'], isFeatured: false, status: 'published', description: '对接外部系统', steps: JSON.stringify([{ title: '获取 API token', content: 'Strapi 后台创建 token' }, { title: '调用列表接口', content: 'GET /api/zhao-website/v1/articles' }, { title: '调用详情接口', content: 'GET /api/zhao-website/v1/articles/:slug' }, { title: '调用留资接口', content: 'POST /api/zhao-website/v1/leads' }, { title: 'webhook 配置', content: '配置回调 URL' }, { title: '错误处理', content: '处理 4xx/5xx' }, { title: '限流', content: '注意 rate limit' }]), materials: JSON.stringify([{ name: 'API 文档', desc: '接口文档' }]), result: '外部系统对接成功' },
  { siteDomain: 'tenant-a.local', seq: 5, title: '权限配置完整教程', slug: 'test-tu-5', difficulty: 'intermediate', estimatedTime: '20 分钟', category: 'a-user-guides', tags: ['企业服务'], isFeatured: false, status: 'published', description: '权限配置指南', steps: JSON.stringify([{ title: '创建角色', content: 'Strapi 后台 → 角色' }, { title: '配置权限', content: '勾选 CT 权限' }, { title: '创建用户', content: '分配角色' }, { title: '验证', content: '登录验证权限' }, { title: '调整', content: '按需调整' }]), materials: JSON.stringify([]), result: '权限体系配置完成' },
  { siteDomain: 'tenant-b.local', seq: 6, title: '性能优化最佳实践', slug: 'test-tu-6', difficulty: 'advanced', estimatedTime: '1 小时', category: 'b-operation-manuals', tags: ['SSR', 'SEO优化'], isFeatured: true, status: 'published', description: '性能优化指南', steps: JSON.stringify([{ title: '开启 SSR 缓存', content: 'routeRules ISR' }, { title: '图片优化', content: 'Nuxt Image' }, { title: '数据库索引', content: '检查索引' }, { title: 'CDN 配置', content: '静态资源 CDN' }, { title: 'gzip 压缩', content: 'Nginx gzip' }, { title: '监控', content: '性能监控' }]), materials: JSON.stringify([]), result: '性能提升 50%+' },
  { siteDomain: 'tenant-b.local', seq: 7, title: '课程发布教程', slug: 'test-tu-7', difficulty: 'beginner', estimatedTime: '10 分钟', category: 'b-operation-manuals', tags: ['教育科技'], isFeatured: false, status: 'published', description: '课程发布流程', steps: JSON.stringify([{ title: '创建课程', content: '填写课程信息' }, { title: '添加课时', content: '添加章节' }, { title: '发布', content: '点击发布' }]), materials: JSON.stringify([]), result: '课程上线' },
  { siteDomain: 'tenant-b.local', seq: 8, title: '学员管理指南', slug: 'test-tu-8', difficulty: 'intermediate', estimatedTime: '15 分钟', category: 'b-operation-manuals', tags: ['教育科技'], isFeatured: false, status: 'draft', description: '学员管理', steps: JSON.stringify([{ title: '查看学员列表', content: '后台 → 学员' }, { title: '分配课程', content: '关联课程' }, { title: '查看进度', content: '学习进度' }, { title: '导出', content: '导出学员数据' }]), materials: JSON.stringify([]), result: '学员管理完成' },
  { siteDomain: 'tenant-b.local', seq: 9, title: '数据备份与恢复', slug: 'test-tu-9', difficulty: 'advanced', estimatedTime: '30 分钟', category: 'b-operation-manuals', tags: ['企业服务'], isFeatured: false, status: 'archived', description: '数据备份恢复', steps: JSON.stringify([{ title: '备份数据库', content: 'pg_dump' }, { title: '备份文件', content: 'uploads 目录' }, { title: '恢复数据库', content: 'pg_restore' }, { title: '验证', content: '验证数据' }]), materials: JSON.stringify([]), result: '备份恢复成功' },
];

async function seedTutorials(knex, siteIdMap, categoryIdMap, tagIdMap) {
  console.log('[9/12] 插入 tutorial...');
  const now = new Date();
  const publishedDate = new Date('2026-07-01');

  for (const t of TUTORIALS) {
    const docId = genDocId('testtu', t.seq);
    const siteId = siteIdMap[t.siteDomain];
    const categoryId = categoryIdMap[t.category];
    const data = {
      document_id: docId,
      site_id: siteId,
      title: t.title,
      slug: t.slug,
      description: t.description,
      steps: t.steps,
      materials: t.materials,
      estimated_time: t.estimatedTime,
      difficulty: t.difficulty,
      result: t.result,
      category_id: categoryId,
      is_featured: t.isFeatured,
      view_count: Math.floor(Math.random() * 400) + 50,
      status: t.status,
      published_at: t.status === 'published' ? publishedDate : null,
      deleted_at: t.status === 'archived' ? now : null,
      created_at: now,
      updated_at: now,
    };
    const id = await insertIfNotExists(knex, 'zhao_website_tutorials', data, docId);

    for (const tagName of t.tags) {
      const tagId = tagIdMap[tagName];
      if (tagId) {
        const existing = await knex('zhao_website_tutorials_tags_lnk')
          .where({ tutorial_id: id, tag_id: tagId }).first();
        if (!existing) {
          await knex('zhao_website_tutorials_tags_lnk').insert({ tutorial_id: id, tag_id: tagId, tag_ord: 0 });
        }
      }
    }
  }
  console.log(`  - 插入 tutorial: ${TUTORIALS.length} 条`);
}

const COMPLIANCES = [
  // 圣麟主站
  { siteDomain: 'localhost', seq: 1, title: '服务协议', slug: 'test-cp-1', category: 'agreement', isPinned: true, allowIndex: false, effectiveDate: '2026-01-01', content: '<h2>服务内容</h2><p>提供多租户官网建设服务...</p>' },
  { siteDomain: 'localhost', seq: 2, title: '隐私政策', slug: 'test-cp-2', category: 'policy', isPinned: true, allowIndex: true, effectiveDate: '2026-01-01', content: '<h2>信息收集</h2><p>收集注册信息、留资、日志...</p>' },
  { siteDomain: 'localhost', seq: 3, title: '数据处理协议', slug: 'test-cp-3', category: 'agreement', isPinned: false, allowIndex: false, effectiveDate: '2026-01-01', content: '<h2>数据处理</h2><p>作为数据处理者...</p>' },
  { siteDomain: 'localhost', seq: 4, title: '等保三级备案', slug: 'test-cp-4', category: 'certificate', isPinned: false, allowIndex: true, effectiveDate: '2026-01-01', expiryDate: '2028-12-31', content: '<h2>备案信息</h2><p>等级：第三级...</p>' },
  // 昭易科技
  { siteDomain: 'tenant-a.local', seq: 5, title: '服务协议', slug: 'test-cp-5', category: 'agreement', isPinned: true, allowIndex: false, effectiveDate: '2026-01-01', content: '<h2>服务内容</h2><p>提供企业官网服务...</p>' },
  { siteDomain: 'tenant-a.local', seq: 6, title: '隐私政策', slug: 'test-cp-6', category: 'policy', isPinned: true, allowIndex: true, effectiveDate: '2026-01-01', content: '<h2>信息收集</h2><p>收集用户信息...</p>' },
  { siteDomain: 'tenant-a.local', seq: 7, title: 'ISO27001 认证', slug: 'test-cp-7', category: 'certificate', isPinned: false, allowIndex: true, effectiveDate: '2025-06-01', expiryDate: '2028-06-01', content: '<h2>认证信息</h2><p>ISO27001 信息安全管理体系...</p>' },
  { siteDomain: 'tenant-a.local', seq: 8, title: '高新技术企业认证', slug: 'test-cp-8', category: 'certificate', isPinned: false, allowIndex: true, effectiveDate: '2025-12-01', expiryDate: '2028-12-01', content: '<h2>认证信息</h2><p>国家高新技术企业...</p>' },
  // 智教云
  { siteDomain: 'tenant-b.local', seq: 9, title: '服务协议', slug: 'test-cp-9', category: 'agreement', isPinned: true, allowIndex: false, effectiveDate: '2026-01-01', content: '<h2>服务内容</h2><p>提供教育平台服务...</p>' },
  { siteDomain: 'tenant-b.local', seq: 10, title: '隐私政策', slug: 'test-cp-10', category: 'policy', isPinned: true, allowIndex: true, effectiveDate: '2026-01-01', content: '<h2>信息收集</h2><p>收集学员信息...</p>' },
  { siteDomain: 'tenant-b.local', seq: 11, title: '软件著作权登记', slug: 'test-cp-11', category: 'certificate', isPinned: false, allowIndex: true, effectiveDate: '2025-03-01', content: '<h2>登记信息</h2><p>软件著作权登记证书...</p>' },
  { siteDomain: 'tenant-b.local', seq: 12, title: '平台公告', slug: 'test-cp-12', category: 'notice', isPinned: false, allowIndex: true, effectiveDate: '2026-07-01', content: '<h2>公告</h2><p>平台升级公告...</p>' },
];

async function seedCompliances(knex, siteIdMap) {
  console.log('[10/12] 插入 compliance...');
  const now = new Date();
  const publishedDate = new Date('2026-07-01');

  for (const c of COMPLIANCES) {
    const docId = genDocId('testcp', c.seq);
    const siteId = siteIdMap[c.siteDomain];
    const data = {
      document_id: docId,
      site_id: siteId,
      title: c.title,
      slug: c.slug,
      category: c.category,
      content: c.content,
      effective_date: c.effectiveDate,
      expiry_date: c.expiryDate || null,
      is_pinned: c.isPinned,
      allow_index: c.allowIndex,
      status: 'published',
      published_at: publishedDate,
      created_at: now,
      updated_at: now,
    };
    await insertIfNotExists(knex, 'zhao_website_compliances', data, docId);
  }
  console.log(`  - 插入 compliance: ${COMPLIANCES.length} 条`);
}

const DOWNLOADS = [
  { siteDomain: 'localhost', seq: 1, name: '交互官网平台白皮书', fileType: 'whitepaper', requireLead: true, isFeatured: true, category: 'main-product-news', fileSize: 5242880, description: '平台白皮书', tags: ['多租户', 'SSR'] },
  { siteDomain: 'localhost', seq: 2, name: '产品功能数据表', fileType: 'datasheet', requireLead: false, isFeatured: false, category: 'main-product-news', fileSize: 1048576, description: '功能数据表', tags: ['内容管理'] },
  { siteDomain: 'tenant-a.local', seq: 3, name: '企业 CMS 技术指南', fileType: 'guide', requireLead: true, isFeatured: true, category: 'a-tech-sharing', fileSize: 3145728, description: '技术指南', tags: ['内容管理', '企业服务'] },
  { siteDomain: 'tenant-a.local', seq: 4, name: '解决方案手册', fileType: 'brochure', requireLead: false, isFeatured: false, category: 'a-solutions', fileSize: 2097152, description: '解决方案手册', tags: ['企业服务'] },
  { siteDomain: 'tenant-b.local', seq: 5, name: '在线教育平台介绍', fileType: 'brochure', requireLead: true, isFeatured: true, category: 'b-course-news', fileSize: 1572864, description: '平台介绍', tags: ['教育科技'] },
  { siteDomain: 'tenant-b.local', seq: 6, name: '课程商城操作手册', fileType: 'guide', requireLead: false, isFeatured: false, category: 'b-operation-manuals', fileSize: 8388608, description: '操作手册', tags: ['教育科技'] },
];

async function seedDownloads(knex, siteIdMap, categoryIdMap, tagIdMap) {
  console.log('[11/12] 插入 download...');
  const now = new Date();
  const publishedDate = new Date('2026-07-01');

  for (const d of DOWNLOADS) {
    const docId = genDocId('testdl', d.seq);
    const siteId = siteIdMap[d.siteDomain];
    const categoryId = categoryIdMap[d.category];
    const data = {
      document_id: docId,
      site_id: siteId,
      name: d.name,
      description: d.description,
      file_type: d.fileType,
      file_size: d.fileSize,
      category_id: categoryId,
      require_lead: d.requireLead,
      download_count: Math.floor(Math.random() * 5000) + 100,
      is_featured: d.isFeatured,
      order: d.seq,
      status: 'published',
      published_at: publishedDate,
      created_at: now,
      updated_at: now,
    };
    const id = await insertIfNotExists(knex, 'zhao_website_downloads', data, docId);

    for (const tagName of d.tags) {
      const tagId = tagIdMap[tagName];
      if (tagId) {
        const existing = await knex('zhao_website_downloads_tags_lnk')
          .where({ download_id: id, tag_id: tagId }).first();
        if (!existing) {
          await knex('zhao_website_downloads_tags_lnk').insert({ download_id: id, tag_id: tagId, tag_ord: 0 });
        }
      }
    }
  }
  console.log(`  - 插入 download: ${DOWNLOADS.length} 条`);
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
      await seedCases(knex, siteIdMap, tagIdMap, productIdMap);
      await seedFaqs(knex, siteIdMap, categoryIdMap);
      await seedTutorials(knex, siteIdMap, categoryIdMap, tagIdMap);
      await seedCompliances(knex, siteIdMap);
      await seedDownloads(knex, siteIdMap, categoryIdMap, tagIdMap);
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
