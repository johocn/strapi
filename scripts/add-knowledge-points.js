// 种子脚本：创建 22 个知识点 tag，统一归到 slug='knowledge-point' 的分组
// 用法：node scripts/add-knowledge-points.js
// 幂等性：name 存在则跳过
// 设计依据：docs/superpowers/specs/2026-08-11-course-tag-pricing-enrollment-design.md 3.1.2
//   - 知识点本质是 tag，归到 knowledge-point 分组
//   - form.vue 读取逻辑：data.tags.filter(t => t.tagGroup?.slug === 'knowledge-point')
const Strapi = require('@strapi/strapi');

const knowledgePointsData = [
  { name: 'JavaScript基础', description: 'JavaScript编程语言的基础知识，包括变量、数据类型、运算符、流程控制等', subgroup: '前端开发', sort: 1 },
  { name: 'ES6+特性', description: 'ECMAScript 6及以上版本的新特性，包括箭头函数、解构赋值、Promise等', subgroup: '前端开发', sort: 2 },
  { name: 'React框架', description: 'Facebook开发的前端框架，用于构建用户界面', subgroup: '前端开发', sort: 3 },
  { name: 'Vue框架', description: '渐进式JavaScript框架，用于构建交互式界面', subgroup: '前端开发', sort: 4 },
  { name: 'CSS样式', description: '层叠样式表，用于网页布局和美化', subgroup: '前端开发', sort: 5 },
  { name: 'HTML结构', description: '超文本标记语言，用于构建网页结构', subgroup: '前端开发', sort: 6 },
  { name: 'Node.js', description: '基于Chrome V8引擎的JavaScript运行时环境', subgroup: '后端开发', sort: 1 },
  { name: 'Express框架', description: 'Node.js的Web应用框架', subgroup: '后端开发', sort: 2 },
  { name: '数据库设计', description: '关系型和非关系型数据库的设计原则和实践', subgroup: '后端开发', sort: 3 },
  { name: 'RESTful API', description: 'REST风格的API设计规范', subgroup: '后端开发', sort: 4 },
  { name: 'TypeScript', description: 'JavaScript的超集，添加了静态类型检查', subgroup: '编程语言', sort: 1 },
  { name: 'Python', description: '高级编程语言，广泛用于数据科学和机器学习', subgroup: '编程语言', sort: 2 },
  { name: 'Git版本控制', description: '分布式版本控制系统', subgroup: '工具与工程', sort: 1 },
  { name: 'Docker容器', description: '容器化技术，用于应用部署', subgroup: '工具与工程', sort: 2 },
  { name: 'CI/CD', description: '持续集成和持续部署流程', subgroup: '工具与工程', sort: 3 },
  { name: '算法基础', description: '常用算法和数据结构', subgroup: '计算机基础', sort: 1 },
  { name: '数据结构', description: '数组、链表、栈、队列、树、图等数据结构', subgroup: '计算机基础', sort: 2 },
  { name: '网络协议', description: 'HTTP、TCP/IP等网络协议原理', subgroup: '计算机基础', sort: 3 },
  { name: '操作系统', description: '操作系统基本原理和概念', subgroup: '计算机基础', sort: 4 },
  { name: '设计模式', description: '常用软件设计模式，如单例模式、工厂模式等', subgroup: '架构设计', sort: 1 },
  { name: '微服务架构', description: '将应用拆分为多个独立服务的架构模式', subgroup: '架构设计', sort: 2 },
  { name: '性能优化', description: '前端和后端性能优化策略', subgroup: '架构设计', sort: 3 },
];

async function run() {
  await Strapi().load();

  const groupService = strapi.documents('plugin::zhao-tag.tag-group');
  const tagService = strapi.documents('plugin::zhao-tag.tag');

  // 1. 查找或创建 slug='knowledge-point' 的分组
  let kpGroup = null;
  const existingGroups = await groupService.findMany({ filters: { slug: { $eq: 'knowledge-point' } } });
  if (existingGroups && existingGroups.length > 0) {
    kpGroup = existingGroups[0];
    console.log(`[SKIP] knowledge-point 分组已存在: id=${kpGroup.documentId}`);
  } else {
    // 回退：按 name 查找（兼容 seed-tag-groups.js 创建的中文名"知识点"）
    const byName = await groupService.findMany({ filters: { name: { $eq: '知识点' } } });
    if (byName && byName.length > 0) {
      kpGroup = byName[0];
      console.log(`[SKIP] 知识点分组已存在（按名称匹配）: id=${kpGroup.documentId}`);
    }
  }

  if (!kpGroup) {
    console.log('[INFO] 创建 knowledge-point 分组...');
    kpGroup = await groupService.create({
      data: {
        name: '知识点',
        slug: 'knowledge-point',
        description: '课程知识点标签',
        sort: 0,
      },
    });
    console.log(`[OK] 创建 knowledge-point 分组: id=${kpGroup.documentId}`);
  }

  // 2. 查询已存在的 tag（幂等）
  const existingTags = await tagService.findMany({
    filters: { tagGroup: { documentId: { $eq: kpGroup.documentId } } },
  });
  const existingNames = new Set((existingTags || []).map(t => t.name));

  // 3. 创建 22 个知识点 tag，统一关联到 knowledge-point 分组
  let created = 0, skipped = 0;
  for (const kp of knowledgePointsData) {
    if (existingNames.has(kp.name)) {
      skipped++;
      continue;
    }
    // description 拼接子分组前缀，便于在 TagPicker 中识别分类
    const fullDescription = `[${kp.subgroup}] ${kp.description}`;
    await tagService.create({
      data: {
        name: kp.name,
        description: fullDescription,
        tagGroup: { documentId: kpGroup.documentId },
        sort: kp.sort,
        isPreset: true,
        isPublic: true,
      },
    });
    created++;
    console.log(`[OK] 创建知识点: ${kp.name} (${kp.subgroup})`);
  }

  console.log(`\n[DONE] 知识点初始化完成: 新建 ${created} 条, 跳过 ${skipped} 条`);
  process.exit(0);
}

run().catch(err => {
  console.error('[ERROR]', err.message);
  console.error(err.stack);
  process.exit(1);
});
