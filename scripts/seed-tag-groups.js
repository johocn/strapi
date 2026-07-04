// 种子脚本：创建 10 个 tag-group + 将 99 个现有标签归类到分组
// 用法：node scripts/seed-tag-groups.js
// 幂等性：name 存在则跳过，关联已存在则跳过
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

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

// 标签名 → 分组名 映射
const TAG_TO_GROUP = {
  '理财': '金融理财', '股票': '金融理财', '信用卡': '金融理财', '投资': '金融理财',
  '外汇': '金融理财', '期货': '金融理财', '黄金': '金融理财', '债券': '金融理财',
  '税务': '金融理财', '退休规划': '金融理财', '风险管理': '金融理财', '基金': '金融理财',
  '保险': '金融理财', '贷款': '金融理财', '存款': '金融理财',
  '沟通': '职场技能', '领导力': '职场技能', '项目管理': '职场技能', '时间管理': '职场技能',
  '谈判': '职场技能', '团队协作': '职场技能', '演讲': '职场技能', '写作': '职场技能',
  '职业规划': '职场技能', '职业发展': '职场技能', '沟通技巧': '职场技能',
  '健康': '生活健康', '运动': '生活健康', '饮食': '生活健康', '心理': '生活健康',
  '旅行': '生活健康', '摄影': '生活健康', '美食': '生活健康', '家居': '生活健康',
  '亲子': '生活健康', '社交': '生活健康', '冥想': '生活健康', '睡眠': '生活健康',
  '编程': 'IT技术', '前端': 'IT技术', '后端': 'IT技术', '移动开发': 'IT技术',
  '人工智能': 'IT技术', '大数据': 'IT技术', '区块链': 'IT技术', '物联网': 'IT技术',
  '网络安全': 'IT技术', '自动化': 'IT技术', '云计算': 'IT技术', '架构设计': 'IT技术',
  '性能优化': 'IT技术', '算法基础': 'IT技术', '测试方法': 'IT技术', '安全防护': 'IT技术',
  '部署运维': 'IT技术', '故障排查': 'IT技术', '系统集成': 'IT技术', '数据处理': 'IT技术',
  '产品经理': '产品设计', 'UI设计': '产品设计', '交互设计': '产品设计', '视觉设计': '产品设计',
  '用户体验': '产品设计', '需求分析': '产品设计', '产品设计': '产品设计', '市场营销': '产品设计',
  '数据分析': '产品设计', '业务分析': '产品设计',
  '入门': '学习路径', '进阶': '学习路径', '高级': '学习路径', '专业': '学习路径',
  '基础概念': '学习路径', '核心原理': '学习路径', '操作步骤': '学习路径', '案例分析': '学习路径',
  '常见问题': '学习路径', '最佳实践': '学习路径', '理论知识': '学习路径', '实践技能': '学习路径',
  '学习方法': '学习路径', '工具使用': '学习路径',
  '考试': '考试认证', '证书': '考试认证', '学历': '考试认证', '语言': '考试认证',
  '设计': '兴趣爱好', '音乐': '兴趣爱好', '艺术': '兴趣爱好',
  '春天': '其他', '夏天': '其他', '口腔': '其他', '小米': '其他',
};

(async () => {
  const client = process.env.DATABASE_CLIENT || 'postgres';
  if (client !== 'postgres') {
    console.log(`[SKIP] DATABASE_CLIENT=${client}, 仅支持 postgres`);
    process.exit(0);
  }

  const knex = require('knex')({
    client: 'pg',
    connection: {
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      database: process.env.DATABASE_NAME || 'strapi',
      user: process.env.DATABASE_USERNAME || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'admin',
    },
  });

  try {
    console.log('[INFO] 开始 seed tag-groups...');

    // 1. 创建 10 个 tag-group（幂等）
    const groupNameToId = {};
    for (const g of GROUPS) {
      let existing = await knex('zhao_tag_groups').where('name', g.name).first();
      if (existing) {
        console.log(`[SKIP] tag-group 已存在: "${g.name}" (id=${existing.id})`);
        groupNameToId[g.name] = existing.id;
      } else {
        const inserted = await knex('zhao_tag_groups').insert({
          name: g.name,
          slug: g.slug,
          description: g.description,
          sort: 0,
          created_at: new Date(),
          updated_at: new Date(),
        }).returning('id');
        const id = Array.isArray(inserted) ? (typeof inserted[0] === 'object' ? inserted[0].id : inserted[0]) : inserted;
        console.log(`[OK] 创建 tag-group: "${g.name}" (id=${id}, slug=${g.slug})`);
        groupNameToId[g.name] = id;
      }
    }

    // 2. 确保 join 表存在
    const joinTableExists = await knex.schema.hasTable('zhao_tags_tag_group_lnk');
    if (!joinTableExists) {
      console.log('[INFO] 创建 join 表 zhao_tags_tag_group_lnk...');
      await knex.schema.createTable('zhao_tags_tag_group_lnk', (table) => {
        table.increments('id').primary();
        table.integer('tag_id').unsigned().notNullable();
        table.integer('tag_group_id').unsigned().notNullable();
        table.double('tag_ord').defaultTo(0);
        table.unique(['tag_id', 'tag_group_id']);
      });
      console.log('[OK] 已创建 join 表');
    }

    // 3. 查询所有 tag 记录
    const tags = await knex('zhao_tags').select('id', 'name');
    console.log(`[INFO] 共 ${tags.length} 个 tag 需要归类`);

    // 4. 建立 tag → tag-group 关联（幂等）
    let linked = 0, skipped = 0, noGroup = 0;
    for (const tag of tags) {
      const groupName = TAG_TO_GROUP[tag.name];
      if (!groupName) {
        console.log(`[WARN] tag "${tag.name}" 无分组映射，跳过`);
        noGroup++;
        continue;
      }
      const tagGroupId = groupNameToId[groupName];
      if (!tagGroupId) {
        console.log(`[WARN] tag "${tag.name}" 的分组 "${groupName}" 未找到，跳过`);
        noGroup++;
        continue;
      }

      const existingLink = await knex('zhao_tags_tag_group_lnk')
        .where({ tag_id: tag.id, tag_group_id: tagGroupId })
        .first();
      if (existingLink) {
        skipped++;
        continue;
      }

      await knex('zhao_tags_tag_group_lnk').insert({
        tag_id: tag.id,
        tag_group_id: tagGroupId,
        tag_ord: 0,
      });
      linked++;
    }

    console.log(`\n[DONE] 关联完成: 新建 ${linked} 条, 跳过 ${skipped} 条, 无分组 ${noGroup} 条`);
    console.log('[DONE] tag-groups 种子完成，可以启动 Strapi');
  } catch (err) {
    console.error('[ERROR]', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await knex.destroy();
  }
})();
