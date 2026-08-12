/**
 * 示例 seed：初始化 10 个 tag-group（标签分组）
 *
 * 文件命名规范：YYYYMMDD_简短描述.js
 * 文件位置：plugins/<plugin>/server/database/seeds/
 *
 * seed-runner 执行机制：
 * - 启动时自动执行未运行的 seed 文件（按 zhao_schema_seeds 表追踪）
 * - 执行成功后记录到 zhao_schema_seeds 表，不会重复执行
 * - 失败不阻断启动（与 migration 不同）
 * - 同时要求 seed 文件内部做幂等检查（findOrCreate 模式），防止手动重跑
 *
 * up 内部可用的 ctx：
 * - strapi: Strapi 实例（推荐用 strapi.documents API）
 * - db: knex 实例（用于直连数据库，如表结构检查、批量更新）
 *
 * 幂等性：
 * - tag-group 按 slug 检查，存在则跳过
 * - tag 关联按 (tag_id, tag_group_id) 检查，存在则跳过
 */
module.exports = {
  async up({ strapi, db }) {
    const GROUPS = [
      { name: '金融理财', slug: 'finance', description: '理财、投资、保险等金融标签' },
      { name: '职场技能', slug: 'workplace', description: '沟通、领导力、项目管理等职场技能' },
      { name: '生活健康', slug: 'lifestyle', description: '健康、运动、饮食等生活方式' },
      { name: 'IT技术', slug: 'tech', description: '编程、前后端、AI、云计算等' },
      { name: '产品设计', slug: 'design', description: '产品经理、UI/UX、用户体验等' },
      { name: '学习路径', slug: 'learning', description: '入门/进阶/高级等学习阶段' },
      { name: '考试认证', slug: 'certification', description: '考试、证书、学历等' },
      { name: '兴趣爱好', slug: 'hobby', description: '设计、音乐、艺术等' },
      { name: '其他', slug: 'other', description: '未分类标签' },
      { name: '知识点', slug: 'knowledge-point', description: '课程知识点标签' },
    ];

    // 标签名 → 分组 slug 映射（用 slug 而非 name，更稳定）
    const TAG_TO_GROUP_SLUG = {
      '理财': 'finance', '股票': 'finance', '信用卡': 'finance', '投资': 'finance',
      '外汇': 'finance', '期货': 'finance', '黄金': 'finance', '债券': 'finance',
      '税务': 'finance', '退休规划': 'finance', '风险管理': 'finance', '基金': 'finance',
      '保险': 'finance', '贷款': 'finance', '存款': 'finance',
      '沟通': 'workplace', '领导力': 'workplace', '项目管理': 'workplace', '时间管理': 'workplace',
      '谈判': 'workplace', '团队协作': 'workplace', '演讲': 'workplace', '写作': 'workplace',
      '职业规划': 'workplace', '职业发展': 'workplace', '沟通技巧': 'workplace',
      '健康': 'lifestyle', '运动': 'lifestyle', '饮食': 'lifestyle', '心理': 'lifestyle',
      '旅行': 'lifestyle', '摄影': 'lifestyle', '美食': 'lifestyle', '家居': 'lifestyle',
      '亲子': 'lifestyle', '社交': 'lifestyle', '冥想': 'lifestyle', '睡眠': 'lifestyle',
      '编程': 'tech', '前端': 'tech', '后端': 'tech', '移动开发': 'tech',
      '人工智能': 'tech', '大数据': 'tech', '区块链': 'tech', '物联网': 'tech',
      '网络安全': 'tech', '自动化': 'tech', '云计算': 'tech', '架构设计': 'tech',
      '性能优化': 'tech', '算法基础': 'tech', '测试方法': 'tech', '安全防护': 'tech',
      '部署运维': 'tech', '故障排查': 'tech', '系统集成': 'tech', '数据处理': 'tech',
      '产品经理': 'design', 'UI设计': 'design', '交互设计': 'design', '视觉设计': 'design',
      '用户体验': 'design', '需求分析': 'design', '产品设计': 'design', '市场营销': 'design',
      '数据分析': 'design', '业务分析': 'design',
      '入门': 'learning', '进阶': 'learning', '高级': 'learning', '专业': 'learning',
      '基础概念': 'learning', '核心原理': 'learning', '操作步骤': 'learning', '案例分析': 'learning',
      '常见问题': 'learning', '最佳实践': 'learning', '理论知识': 'learning', '实践技能': 'learning',
      '学习方法': 'learning', '工具使用': 'learning',
      '考试': 'certification', '证书': 'certification', '学历': 'certification', '语言': 'certification',
      '设计': 'hobby', '音乐': 'hobby', '艺术': 'hobby',
      '春天': 'other', '夏天': 'other', '口腔': 'other', '小米': 'other',
    };

    const groupService = strapi.documents('plugin::zhao-tag.tag-group');
    const tagService = strapi.documents('plugin::zhao-tag.tag');

    // 1. 创建 10 个 tag-group（按 slug 幂等）
    const slugToDocId = {};
    for (const g of GROUPS) {
      const existing = await groupService.findMany({
        filters: { slug: { $eq: g.slug } },
      });
      if (existing && existing.length > 0) {
        slugToDocId[g.slug] = existing[0].documentId;
        console.log(`[seed 20260812] [SKIP] tag-group 已存在: "${g.name}" (slug=${g.slug})`);
        continue;
      }
      const created = await groupService.create({ data: g });
      slugToDocId[g.slug] = created.documentId;
      console.log(`[seed 20260812] [OK] 创建 tag-group: "${g.name}" (slug=${g.slug})`);
    }

    // 2. 查询所有 tag 记录
    const tags = await tagService.findMany({ limit: 1000 });
    console.log(`[seed 20260812] 共 ${tags.length} 个 tag 需要归类`);

    // 3. 建立 tag → tag-group 关联（幂等）
    let linked = 0;
    let skipped = 0;
    let noGroup = 0;
    for (const tag of tags) {
      const groupSlug = TAG_TO_GROUP_SLUG[tag.name];
      if (!groupSlug) {
        noGroup++;
        continue;
      }
      const groupDocId = slugToDocId[groupSlug];
      if (!groupDocId) {
        noGroup++;
        continue;
      }

      // 检查是否已关联（tagGroup 是 manyToOne 单数关系）
      const currentGroup = tag.tagGroup;
      const alreadyLinked = currentGroup && currentGroup.documentId === groupDocId;
      if (alreadyLinked) {
        skipped++;
        continue;
      }

      await tagService.update({
        documentId: tag.documentId,
        data: {
          tagGroup: groupDocId,
        },
      });
      linked++;
    }

    console.log(`[seed 20260812] 关联完成: 新建 ${linked} 条, 跳过 ${skipped} 条, 无分组 ${noGroup} 条`);
  },

  async down({ strapi, db }) {
    // 种子回滚：删除本种子创建的 tag-group（按 slug 精确匹配，不误删）
    const SLUGS = ['finance', 'workplace', 'lifestyle', 'tech', 'design', 'learning', 'certification', 'hobby', 'other', 'knowledge-point'];
    const groupService = strapi.documents('plugin::zhao-tag.tag-group');
    for (const slug of SLUGS) {
      const existing = await groupService.findMany({ filters: { slug: { $eq: slug } } });
      if (existing && existing.length > 0) {
        await groupService.delete({ documentId: existing[0].documentId });
        console.log(`[seed 20260812] [DOWN] 删除 tag-group: slug=${slug}`);
      }
    }
  },
};
