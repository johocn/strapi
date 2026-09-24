# 标签与知识点统一架构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将知识点统一为 zhao-tag 中"知识点"分组的标签，删除业务方 knowledgePoints 关系，前端组件统一为 TagPicker mode 模式。

**Architecture:** 创建 10 个 tag-group（含知识点分组）+ 99 个标签归类 + 迁移 knowledge-point 数据到 tag + 业务方 schema 删除 knowledgePoints + 前端 TagPicker 扩展 mode prop + 废弃 KnowledgePointPicker。

**Tech Stack:** Strapi v5 plugin, TypeScript, Knex, PostgreSQL, Vue 3

**参考规范：**
- 设计文档：`e:\code\docs\superpowers\specs\2026-07-04-tag-knowledge-unification-design.md`
- 已有迁移脚本模板：`e:\code\basic\scripts\migrate-tag-group.js`
- TagPicker 现状：`e:\code\web\src\components\TagPicker.vue`

**约束：**
- git 仓库在 `e:\code\basic`（后端）和 `e:\code\web`（前端，实际 git root 在 e:\code）
- Strapi v5 develop 模式不会自动重编译插件 dist bundle，需 `npm run build`
- 迁移脚本必须在 Strapi 启动前执行（避免 join 表被删除）
- 测试方式：HTTP 请求验证路由返回 200

---

## 文件结构

### zhao-tag 插件（移除 knowledge-point API 层）

```
plugins/zhao-tag/server/src/
├── controllers/
│   ├── knowledge-point.ts       # 删除
│   └── index.ts                 # 修改：移除 knowledge-point 注册
├── services/
│   ├── knowledge-point.ts       # 删除
│   └── index.ts                 # 修改：移除 knowledge-point 注册
├── routes/
│   └── content-api.ts           # 修改：移除 knowledge-point 路由 7 条
├── permissions.ts               # 修改：移除 knowledge-point 权限 4 条
└── content-types/
    └── knowledge-point/         # 保留 schema 不删除
```

### 业务方插件（删除 knowledgePoints 关系）

```
plugins/zhao-course/server/src/
├── content-types/course/schema.json   # 修改：删除 knowledgePoints 字段
└── services/course.ts                 # 修改：移除 knowledgePoints populate

plugins/zhao-quiz/server/src/
├── content-types/quiz/schema.json     # 修改：删除 knowledgePoints 字段
└── services/quiz.ts                   # 修改：移除 knowledgePoints populate + findByKnowledgePoint
```

### 迁移脚本

- `e:\code\basic\scripts\seed-tag-groups.js`（新增，创建 10 个分组 + 归类 99 个标签）
- `e:\code\basic\scripts\migrate-knowledge-points.js`（新增，迁移 knowledge-point → tag + 业务方关系）

### 前端

- `e:\code\web\src\components\TagPicker.vue`（修改：新增 mode prop）
- `e:\code\web\src\components\KnowledgePointPicker.vue`（删除）
- `e:\code\web\src\api\tag.js`（修改：移除 knowledge-point API）
- `e:\code\web\pages\course\form.vue`（修改：知识点选择改用 TagPicker）
- `e:\code\web\pages\quiz\form.vue`（修改：同上）

---

## Task 1: 移除 zhao-tag knowledge-point API 层

**Files:**
- Delete: `e:\code\basic\plugins\zhao-tag\server\src\controllers\knowledge-point.ts`
- Delete: `e:\code\basic\plugins\zhao-tag\server\src\services\knowledge-point.ts`
- Modify: `e:\code\basic\plugins\zhao-tag\server\src\controllers\index.ts`
- Modify: `e:\code\basic\plugins\zhao-tag\server\src\services\index.ts`
- Modify: `e:\code\basic\plugins\zhao-tag\server\src\routes\content-api.ts`
- Modify: `e:\code\basic\plugins\zhao-tag\server\src\permissions.ts`

- [ ] **Step 1: 删除 knowledge-point controller 和 service 文件**

使用 DeleteFile 工具删除：
- `e:\code\basic\plugins\zhao-tag\server\src\controllers\knowledge-point.ts`
- `e:\code\basic\plugins\zhao-tag\server\src\services\knowledge-point.ts`

- [ ] **Step 2: 修改 controllers/index.ts 移除 knowledge-point 注册**

将文件内容完整替换为：

```ts
import tag from "./tag";
import tagIndex from "./tag-index";
import tagGroup from "./tag-group";

export default {
  tag,
  "tag-index": tagIndex,
  "tag-group": tagGroup,
};
```

- [ ] **Step 3: 修改 services/index.ts 移除 knowledge-point 注册**

将文件内容完整替换为：

```ts
import tag from "./tag";
import tagIndex from "./tag-index";
import tagGroup from "./tag-group";

export default {
  tag,
  "tag-index": tagIndex,
  "tag-group": tagGroup,
};
```

- [ ] **Step 4: 修改 routes/content-api.ts 移除 knowledge-point 路由**

删除以下 7 条路由（公开 2 + 管理 5）：

```ts
    // ===== 公开路由（knowledge-point） =====
    publicRoute("GET", "/knowledge-points", "knowledge-point.find"),
    publicRoute("GET", "/knowledge-points/:documentId", "knowledge-point.findOne"),

    // ===== 管理路由（knowledge-point） =====
    channelScopeRoute("GET", "/knowledge-points", "knowledge-point.find", "knowledge-point.read"),
    channelScopeRoute("GET", "/knowledge-points/:documentId", "knowledge-point.findOne", "knowledge-point.read"),
    channelScopeRoute("POST", "/knowledge-points", "knowledge-point.create", "knowledge-point.create"),
    channelScopeRoute("PUT", "/knowledge-points/:documentId", "knowledge-point.update", "knowledge-point.update"),
    channelScopeRoute("DELETE", "/knowledge-points/:documentId", "knowledge-point.delete", "knowledge-point.delete"),
```

包括注释行 `// ===== 公开路由（knowledge-point） =====` 和 `// ===== 管理路由（knowledge-point） =====`。

- [ ] **Step 5: 修改 permissions.ts 移除 knowledge-point 权限**

删除以下 4 行：

```ts
  "knowledge-point.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR, ROLES.USER] },
  "knowledge-point.create": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR] },
  "knowledge-point.update": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR] },
  "knowledge-point.delete": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
```

- [ ] **Step 6: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-tag/server/src/controllers/ plugins/zhao-tag/server/src/services/ plugins/zhao-tag/server/src/routes/content-api.ts plugins/zhao-tag/server/src/permissions.ts
git commit -m "refactor(zhao-tag): 移除 knowledge-point API 层"
```

---

## Task 2: 删除 course schema 的 knowledgePoints 关系

**Files:**
- Modify: `e:\code\basic\plugins\zhao-course\server\src\content-types\course\schema.json`

- [ ] **Step 1: 删除 knowledgePoints 字段**

在 `e:\code\basic\plugins\zhao-course\server\src\content-types\course\schema.json` 中删除：

```json
    "knowledgePoints": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "plugin::zhao-tag.knowledge-point"
    },
```

注意删除时处理好前后的逗号（确保 JSON 合法）。

- [ ] **Step 2: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-course/server/src/content-types/course/schema.json
git commit -m "refactor(zhao-course): 删除 course.knowledgePoints 关系"
```

---

## Task 3: 删除 quiz schema 的 knowledgePoints 关系

**Files:**
- Modify: `e:\code\basic\plugins\zhao-quiz\server\src\content-types\quiz\schema.json`

- [ ] **Step 1: 删除 knowledgePoints 字段**

在 `e:\code\basic\plugins\zhao-quiz\server\src\content-types\quiz\schema.json` 中删除：

```json
    "knowledgePoints": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "plugin::zhao-tag.knowledge-point"
    },
```

保留 `tags` 字段不变。处理好前后的逗号（确保 JSON 合法）。

- [ ] **Step 2: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-quiz/server/src/content-types/quiz/schema.json
git commit -m "refactor(zhao-quiz): 删除 quiz.knowledgePoints 关系"
```

---

## Task 4: 移除 course service 的 knowledgePoints populate

**Files:**
- Modify: `e:\code\basic\plugins\zhao-course\server\src\services\course.ts`

- [ ] **Step 1: 移除所有 knowledgePoints populate**

在 `e:\code\basic\plugins\zhao-course\server\src\services\course.ts` 中，找到所有 `knowledgePoints: true,` 行并删除。

已知位置（基于 grep 结果）：
- L111: `knowledgePoints: true,`
- L133: `knowledgePoints: true,`
- L347: `knowledgePoints: true,`

可能有更多位置，需全文搜索确认。

- [ ] **Step 2: 移除 knowledgePoints 相关过滤逻辑（如有）**

搜索 `knowledgePoints` 关键字，如 find 查询中有 `filters.knowledgePoints` 等过滤逻辑，移除或改为 `filters.tags`。

- [ ] **Step 3: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-course/server/src/services/course.ts
git commit -m "refactor(zhao-course): 移除 knowledgePoints populate"
```

---

## Task 5: 移除 quiz service 的 knowledgePoints 逻辑

**Files:**
- Modify: `e:\code\basic\plugins\zhao-quiz\server\src\services\quiz.ts`

- [ ] **Step 1: 移除 knowledgePoints populate**

在 `e:\code\basic\plugins\zhao-quiz\server\src\services\quiz.ts` 中，删除所有 `knowledgePoints: true,` 行。

已知位置：
- L37: `knowledgePoints: true,`
- L57: `knowledgePoints: true,`
- L108: `knowledgePoints: true,`

- [ ] **Step 2: 移除 findByKnowledgePoint 方法**

删除整个 `findByKnowledgePoint` 方法（约 L106-110）：

```ts
  async findByKnowledgePoint(kpDocumentId: string, query: any = {}) {
    return strapi.documents(UID).findMany({
      ...query,
      filters: { knowledgePoints: { documentId: kpDocumentId }, ...(query.filters || {}) },
      populate: { knowledgePoints: true },
    });
  },
```

- [ ] **Step 3: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-quiz/server/src/services/quiz.ts
git commit -m "refactor(zhao-quiz): 移除 knowledgePoints 逻辑"
```

---

## Task 6: 创建 seed-tag-groups.js 种子脚本

**Files:**
- Create: `e:\code\basic\scripts\seed-tag-groups.js`

- [ ] **Step 1: 创建种子脚本**

```js
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
        const [id] = await knex('zhao_tag_groups').insert({
          name: g.name,
          slug: g.slug,
          description: g.description,
          sort: 0,
          created_at: new Date(),
          updated_at: new Date(),
        });
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
```

- [ ] **Step 2: 提交**

```bash
cd e:\code\basic
git add scripts/seed-tag-groups.js
git commit -m "feat(zhao-tag): 新增 tag-groups 种子脚本"
```

---

## Task 7: 创建 migrate-knowledge-points.js 迁移脚本

**Files:**
- Create: `e:\code\basic\scripts\migrate-knowledge-points.js`

- [ ] **Step 1: 创建迁移脚本**

```js
// 迁移脚本：将 knowledge-point 数据迁移为 tag（归入"知识点"分组）
// + 将 course/quiz 的 knowledgePoints 关系迁移到 tags 关系
// 用法：node scripts/migrate-knowledge-points.js
// 必须在 Strapi 启动前执行（避免 join 表被删除）
// 幂等性：tag name 已存在则跳过，关联已存在则跳过
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

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
    console.log('[INFO] 开始迁移 knowledge-point → tag...');

    // 1. 检测 knowledge-point 表是否存在
    const kpTableExists = await knex.schema.hasTable('zhao_knowledge_points');
    if (!kpTableExists) {
      console.log('[SKIP] zhao_knowledge_points 表不存在，无需迁移');
      process.exit(0);
    }

    // 2. 查找"知识点"分组的 id
    const kpGroup = await knex('zhao_tag_groups').where('slug', 'knowledge-point').first();
    if (!kpGroup) {
      console.log('[ERROR] 未找到 slug=knowledge-point 的 tag-group，请先运行 seed-tag-groups.js');
      process.exit(1);
    }
    console.log(`[INFO] 知识点分组 id=${kpGroup.id}`);

    // 3. 读取所有 knowledge-point 记录（排除 test-kp）
    const kps = await knex('zhao_knowledge_points')
      .whereNot('name', 'test-kp')
      .select('id', 'document_id', 'name', 'description', 'code', 'level', 'sort');
    console.log(`[INFO] 找到 ${kps.length} 条 knowledge-point 记录需迁移`);

    // 4. 为每个 knowledge-point 创建对应的 tag（幂等：name 已存在则跳过）
    const kpIdToTagId = {};
    for (const kp of kps) {
      let existingTag = await knex('zhao_tags').where('name', kp.name).first();
      if (existingTag) {
        console.log(`[SKIP] tag 已存在: "${kp.name}" (id=${existingTag.id})`);
        kpIdToTagId[kp.id] = existingTag.id;
      } else {
        const [tagId] = await knex('zhao_tags').insert({
          document_id: kp.document_id,
          name: kp.name,
          slug: null,
          description: kp.description,
          sort: kp.sort || 0,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`[OK] 创建 tag: "${kp.name}" (id=${tagId})`);
        kpIdToTagId[kp.id] = tagId;
      }

      // 建立 tag → 知识点分组 关联（幂等）
      const existingLink = await knex('zhao_tags_tag_group_lnk')
        .where({ tag_id: kpIdToTagId[kp.id], tag_group_id: kpGroup.id })
        .first();
      if (!existingLink) {
        await knex('zhao_tags_tag_group_lnk').insert({
          tag_id: kpIdToTagId[kp.id],
          tag_group_id: kpGroup.id,
          tag_ord: 0,
        });
        console.log(`[OK] tag "${kp.name}" 关联到知识点分组`);
      }
    }

    // 5. 迁移 course.knowledgePoints → course.tags
    const courseKpLnkExists = await knex.schema.hasTable('zhao_courses_knowledge_points_lnk');
    if (courseKpLnkExists) {
      console.log('[INFO] 迁移 course.knowledgePoints → course.tags...');
      const courseLinks = await knex('zhao_courses_knowledge_points_lnk').select('*');
      let migrated = 0;
      for (const link of courseLinks) {
        const tagId = kpIdToTagId[link.knowledge_point_id];
        if (!tagId) {
          console.log(`[WARN] knowledge_point_id=${link.knowledge_point_id} 未找到对应 tag，跳过`);
          continue;
        }
        // 检查 course.tags 关联是否已存在
        const existing = await knex('zhao_courses_tags_lnk')
          .where({ course_id: link.course_id, tag_id: tagId })
          .first();
        if (existing) {
          continue;
        }
        // 检查 join 表是否存在
        const courseTagsLnkExists = await knex.schema.hasTable('zhao_courses_tags_lnk');
        if (!courseTagsLnkExists) {
          console.log('[WARN] zhao_courses_tags_lnk 表不存在，跳过 course 关联迁移');
          break;
        }
        await knex('zhao_courses_tags_lnk').insert({
          course_id: link.course_id,
          tag_id: tagId,
          tag_ord: 0,
        });
        migrated++;
      }
      console.log(`[OK] course 关联迁移 ${migrated} 条`);
    } else {
      console.log('[SKIP] zhao_courses_knowledge_points_lnk 表不存在');
    }

    // 6. 迁移 quiz.knowledgePoints → quiz.tags
    const quizKpLnkExists = await knex.schema.hasTable('zhao_quizzes_knowledge_points_lnk');
    if (quizKpLnkExists) {
      console.log('[INFO] 迁移 quiz.knowledgePoints → quiz.tags...');
      const quizLinks = await knex('zhao_quizzes_knowledge_points_lnk').select('*');
      let migrated = 0;
      for (const link of quizLinks) {
        const tagId = kpIdToTagId[link.knowledge_point_id];
        if (!tagId) {
          console.log(`[WARN] knowledge_point_id=${link.knowledge_point_id} 未找到对应 tag，跳过`);
          continue;
        }
        const quizTagsLnkExists = await knex.schema.hasTable('zhao_quizzes_tags_lnk');
        if (!quizTagsLnkExists) {
          console.log('[WARN] zhao_quizzes_tags_lnk 表不存在，跳过 quiz 关联迁移');
          break;
        }
        const existing = await knex('zhao_quizzes_tags_lnk')
          .where({ quiz_id: link.quiz_id, tag_id: tagId })
          .first();
        if (existing) {
          continue;
        }
        await knex('zhao_quizzes_tags_lnk').insert({
          quiz_id: link.quiz_id,
          tag_id: tagId,
          tag_ord: 0,
        });
        migrated++;
      }
      console.log(`[OK] quiz 关联迁移 ${migrated} 条`);
    } else {
      console.log('[SKIP] zhao_quizzes_knowledge_points_lnk 表不存在');
    }

    console.log('\n[DONE] knowledge-point 迁移完成，可以启动 Strapi');
  } catch (err) {
    console.error('[ERROR]', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await knex.destroy();
  }
})();
```

- [ ] **Step 2: 提交**

```bash
cd e:\code\basic
git add scripts/migrate-knowledge-points.js
git commit -m "feat(zhao-tag): 新增 knowledge-point 迁移脚本"
```

---

## Task 8: 构建 zhao-tag/zhao-course/zhao-quiz 插件

**Files:** 无（仅构建）

- [ ] **Step 1: 构建 zhao-tag**

```bash
cd e:\code\basic\plugins\zhao-tag
npm run build
```

预期：dist/server/index.js 重新生成，无 TypeScript 错误。

- [ ] **Step 2: 构建 zhao-course**

```bash
cd e:\code\basic\plugins\zhao-course
npm run build
```

- [ ] **Step 3: 构建 zhao-quiz**

```bash
cd e:\code\basic\plugins\zhao-quiz
npm run build
```

- [ ] **Step 4: 验证构建成功**

检查三个命令退出码均为 0。如构建失败，根据 TypeScript 错误修复。

- [ ] **Step 5: 不提交（dist 被 .gitignore 排除）**

---

## Task 9: 执行迁移脚本

**Files:** 无（仅数据库操作）

- [ ] **Step 1: 停止 Strapi 服务**

```bash
# PowerShell
Get-NetTCPConnection -LocalPort 1337 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
```

- [ ] **Step 2: 执行 seed-tag-groups.js**

```bash
cd e:\code\basic
node scripts/seed-tag-groups.js
```

预期输出：
- 创建 10 个 tag-group（或 SKIP 已存在）
- 关联 99 个 tag 到对应分组
- `[DONE] tag-groups 种子完成`

- [ ] **Step 3: 执行 migrate-knowledge-points.js**

```bash
cd e:\code\basic
node scripts/migrate-knowledge-points.js
```

预期输出：
- 找到 knowledge-point 记录（排除 test-kp）
- 创建对应 tag（JavaScript基础）
- 关联到"知识点"分组
- 迁移 course/quiz 关系（如有关联数据）
- `[DONE] knowledge-point 迁移完成`

- [ ] **Step 4: 不提交（数据库操作无 git 改动）**

---

## Task 10: 启动 Strapi 并验证 schema 重建

**Files:** 无（仅启动验证）

- [ ] **Step 1: 启动 Strapi**

```bash
cd e:\code\basic
npm run develop
```

使用 RunCommand 的 non-blocking 模式，等待 30 秒后检查输出。

- [ ] **Step 2: 验证启动成功**

预期日志：
- `Strapi started successfully`
- 无 schema 迁移错误
- knowledge-point 路由不再注册（已移除）
- course/quiz schema 重建（删除 knowledgePoints 字段）

如启动失败，根据错误信息修复。

- [ ] **Step 3: 验证 knowledge-point 路由已移除**

```bash
# PowerShell - 应返回 404
try { Invoke-WebRequest -Uri "http://localhost:1337/api/zhao-tag/v1/admin/knowledge-points" -Method GET -ErrorAction Stop } catch { Write-Output "STATUS: $($_.Exception.Response.StatusCode.value__)" }
```

预期：返回 404（路由不存在）

- [ ] **Step 4: 验证 tag-groups 种子数据**

```bash
# PowerShell
$response = Invoke-RestMethod -Uri "http://localhost:1337/api/zhao-tag/v1/tag-groups?pagination[pageSize]=20" -Method GET
Write-Output "Tag groups count: $($response.data.Count)"
$response.data | Select-Object name, slug | ConvertTo-Json
```

预期：返回 10 个 tag-group，含"知识点"分组（slug=knowledge-point）

- [ ] **Step 5: 不提交**

---

## Task 11: 前端 TagPicker.vue 扩展 mode prop

**Files:**
- Modify: `e:\code\web\src\components\TagPicker.vue`

- [ ] **Step 1: 新增 mode prop**

在 props 定义中新增（在 `defaultGroupId`/`defaultGroupName` 之后）：

```js
mode: { type: String, default: 'all' }, // 'tag' | 'knowledge-point' | 'all'
```

- [ ] **Step 2: 修改 loadGroups 方法按 mode 过滤分组**

找到 `loadGroups` 方法（约 L230-240），在 `groupList.value = result.list || []` 之前新增过滤逻辑：

```js
// 按 mode 过滤分组
let groups = result.list || [];
if (props.mode === 'tag') {
  groups = groups.filter(g => g.slug !== 'knowledge-point');
} else if (props.mode === 'knowledge-point') {
  groups = groups.filter(g => g.slug === 'knowledge-point');
}
groupList.value = groups;
```

- [ ] **Step 3: 提交**

```bash
cd e:\code\web
git add src/components/TagPicker.vue
git commit -m "feat(web): TagPicker 新增 mode prop 支持知识点过滤"
```

---

## Task 12: 前端 course/form.vue 改用 TagPicker mode="knowledge-point"

**Files:**
- Modify: `e:\code\web\pages\course\form.vue`

- [ ] **Step 1: 移除 KnowledgePointPicker 导入和使用**

删除 L454 的导入：

```js
import KnowledgePointPicker from '../../src/components/KnowledgePointPicker.vue'
```

删除 L380-381 的组件使用：

```vue
<KnowledgePointPicker
  v-model:visible="showKnowledgePointPicker"
```

整个 KnowledgePointPicker 组件块需删除（找到完整标签闭合）。

- [ ] **Step 2: 将知识点选择改用 TagPicker mode="knowledge-point"**

找到原 KnowledgePointPicker 使用位置，替换为：

```vue
<TagPicker
  v-model:visible="showKnowledgePointPicker"
  mode="knowledge-point"
  :selected="selectedKnowledgePoints"
  @confirm="onKnowledgePointConfirm"
/>
```

确保 `TagPicker` 已导入（如未导入则添加）：

```js
import TagPicker from '../../src/components/TagPicker.vue'
```

- [ ] **Step 3: 修改 submitData 中的 knowledgePoints 字段**

找到 L846-848 的知识点保存逻辑：

```js
  // 知识点保存到 knowledgePoints 字段（也是 zhao-tag 标签，但通过 separate relation）
  ...
  submitData.knowledgePoints = selectedKnowledgePoints.value.map(kp => ({ documentId: kp.documentId }))
```

改为统一保存到 `tags` 字段（与普通标签合并）：

```js
  // 知识点统一保存到 tags 字段（知识点是 zhao-tag 中"知识点"分组的标签）
  const kpTagDocs = selectedKnowledgePoints.value.map(kp => ({ documentId: kp.documentId }))
  submitData.tags = [...(submitData.tags || []), ...kpTagDocs]
```

注意去重（如 selectedTags 和 selectedKnowledgePoints 可能有重复）：

```js
  const allTagDocs = [...(selectedTags.value || []), ...selectedKnowledgePoints.value]
  const uniqueDocs = []
  const seen = new Set()
  for (const t of allTagDocs) {
    if (!seen.has(t.documentId)) {
      seen.add(t.documentId)
      uniqueDocs.push({ documentId: t.documentId })
    }
  }
  submitData.tags = uniqueDocs
```

- [ ] **Step 4: 修改 loadCourseData 中的 knowledgePoints 回填**

找到 L732-733：

```js
  if (data.knowledgePoints && data.knowledgePoints.length > 0) {
    selectedKnowledgePoints.value = data.knowledgePoints
  }
```

由于 course schema 已删除 knowledgePoints 字段，后端不再返回该字段。知识点现在混在 tags 中。

改为从 tags 中按"知识点"分组过滤：

```js
  // 知识点现在混在 tags 中，按 tagGroup.slug === 'knowledge-point' 过滤
  if (data.tags && data.tags.length > 0) {
    const kpTags = data.tags.filter(t => t.tagGroup?.slug === 'knowledge-point')
    selectedKnowledgePoints.value = kpTags
    const normalTags = data.tags.filter(t => t.tagGroup?.slug !== 'knowledge-point')
    selectedTags.value = normalTags
  }
```

- [ ] **Step 5: 提交**

```bash
cd e:\code\web
git add pages/course/form.vue
git commit -m "refactor(web): course 表单知识点选择改用 TagPicker mode=knowledge-point"
```

---

## Task 13: 前端 quiz/form.vue 改用 TagPicker mode="knowledge-point"

**Files:**
- Modify: `e:\code\web\pages\quiz\form.vue`

- [ ] **Step 1: 读取当前 quiz/form.vue 的知识点选择实现**

使用 Read 工具读取 `e:\code\web\pages\quiz\form.vue`，找到 KnowledgePointPicker 引用和 knowledgePoints 字段处理逻辑。

- [ ] **Step 2: 按照与 Task 12 相同的模式修改**

- 移除 KnowledgePointPicker 导入和使用
- 改用 `<TagPicker mode="knowledge-point" />`
- submitData.knowledgePoints 改为合并到 submitData.tags
- loadQuizData 中 knowledgePoints 回填改为从 tags 按 tagGroup.slug 过滤

具体代码参考 Task 12 的 Step 2-4。

- [ ] **Step 3: 提交**

```bash
cd e:\code\web
git add pages/quiz/form.vue
git commit -m "refactor(web): quiz 表单知识点选择改用 TagPicker mode=knowledge-point"
```

---

## Task 14: 清理前端 knowledge-point API 和组件

**Files:**
- Modify: `e:\code\web\src\api\tag.js`
- Delete: `e:\code\web\src\components\KnowledgePointPicker.vue`

- [ ] **Step 1: 修改 src/api/tag.js 移除 knowledge-point API**

删除以下 5 个函数（约 L101-117）：

```js
export function getKnowledgePoints(params = {}) {
  return get(`${ADMIN}/knowledge-points`, params).then(extractList)
}
export function getKnowledgePoint(documentId) {
  return get(`${ADMIN}/knowledge-points/${documentId}`).then(extractItem)
}
export function createKnowledgePoint(data) {
  return post(`${ADMIN}/knowledge-points`, { data }).then(extractItem)
}
export function updateKnowledgePoint(documentId, data) {
  return put(`${ADMIN}/knowledge-points/${documentId}`, { data }).then(extractItem)
}
export function deleteKnowledgePoint(documentId) {
  return del(`${ADMIN}/knowledge-points/${documentId}`).then(extractItem)
}
```

- [ ] **Step 2: 删除 KnowledgePointPicker.vue 组件**

使用 DeleteFile 工具删除：
- `e:\code\web\src\components\KnowledgePointPicker.vue`

- [ ] **Step 3: 检查其他文件是否引用 knowledge-point API 或 KnowledgePointPicker**

使用 Grep 搜索：
- `KnowledgePointPicker` 在 `e:\code\web` 下的所有引用
- `getKnowledgePoints|createKnowledgePoint|updateKnowledgePoint|deleteKnowledgePoint|getKnowledgePoint` 在 `e:\code\web` 下的所有引用

如发现遗漏的引用（如 knowledge.vue / knowledge-form.vue 页面），记录下来但不在本 Task 修改（这些页面可能需要单独处理，见 Task 15）。

- [ ] **Step 4: 提交**

```bash
cd e:\code\web
git add src/api/tag.js
git rm src/components/KnowledgePointPicker.vue
git commit -m "refactor(web): 移除 knowledge-point API 和 KnowledgePointPicker 组件"
```

---

## Task 15: 清理前端 knowledge 页面

**Files:**
- Modify or Delete: `e:\code\web\pages\tag\knowledge.vue`
- Modify or Delete: `e:\code\web\pages\tag\knowledge-form.vue`

- [ ] **Step 1: 读取 knowledge.vue 和 knowledge-form.vue**

使用 Read 工具读取两个文件，理解当前实现。

- [ ] **Step 2: 决策处理方式**

根据文件内容判断：
- 如果页面是独立的"知识点管理"页面，可保留但改为调用 tag API + 过滤 knowledge-point 分组
- 如果页面是 KnowledgePointPicker 的简单包装，可删除并重定向到标签管理页

**推荐方案**：保留 knowledge.vue 作为"知识点管理"页面，但改为：
- 调用 `getTags({ filters: { tagGroup: { slug: 'knowledge-point' } } })` 获取知识点
- 创建/编辑时自动绑定"知识点"分组

knowledge-form.vue 同理。

- [ ] **Step 3: 修改 knowledge.vue**

具体修改根据 Step 1 读取结果决定。核心改动：
- API 调用从 `getKnowledgePoints` 改为 `getTags` + 过滤
- 表单提交从 `createKnowledgePoint` 改为 `createTag` + 自动设置 tagGroup

- [ ] **Step 4: 修改 knowledge-form.vue**

同 Step 3。

- [ ] **Step 5: 提交**

```bash
cd e:\code\web
git add pages/tag/knowledge.vue pages/tag/knowledge-form.vue
git commit -m "refactor(web): knowledge 页面改用 tag API + knowledge-point 分组过滤"
```

---

## Task 16: 端到端验证

**Files:** 无（仅验证）

- [ ] **Step 1: 验证 tag-groups 含知识点分组**

```bash
# PowerShell
$response = Invoke-RestMethod -Uri "http://localhost:1337/api/zhao-tag/v1/tag-groups?pagination[pageSize]=20" -Method GET
Write-Output "Tag groups count: $($response.data.Count)"
$response.data | Select-Object name, slug | Format-Table
```

预期：10 个分组，含"知识点"（slug=knowledge-point）

- [ ] **Step 2: 验证 tag 已归类**

```bash
# PowerShell - 查询 IT技术 分组下的标签
$response = Invoke-RestMethod -Uri "http://localhost:1337/api/zhao-tag/v1/tags?pagination[pageSize]=200&populate[tagGroup]=true" -Method GET
$response.data | Where-Object { $_.tagGroup?.slug -eq 'tech' } | Select-Object name | Format-Table
```

预期：返回 IT技术 分组下的 20 个标签

- [ ] **Step 3: 验证 knowledge-point 路由已移除**

```bash
# PowerShell - 应返回 404
try { Invoke-WebRequest -Uri "http://localhost:1337/api/zhao-tag/v1/admin/knowledge-points" -Method GET -ErrorAction Stop } catch { Write-Output "STATUS: $($_.Exception.Response.StatusCode.value__)" }
```

预期：404

- [ ] **Step 4: 验证 course schema 无 knowledgePoints**

```bash
# PowerShell - 查询 course 详情，确认无 knowledgePoints 字段
$response = Invoke-RestMethod -Uri "http://localhost:1337/api/zhao-course/v1/courses?pagination[pageSize]=1&populate[tags]=true" -Method GET
$response.data | Select-Object -Property * -ExcludeProperty *_lnk | ConvertTo-Json -Depth 2
```

预期：course 数据中无 knowledgePoints 字段，tags 字段正常

- [ ] **Step 5: 验证前端课程表单**

打开浏览器访问 `http://localhost:5175/#/pages/course/form?id=e3nkbz8dvn1dkmfezfyna7xi`，确认：
1. 标签选择器（TagPicker mode="tag"）显示 9 个普通分组（无知识点分组）
2. 知识点选择器（TagPicker mode="knowledge-point"）只显示知识点分组
3. 知识点选择器可选择"JavaScript基础"（已迁移的标签）
4. 保存课程后，知识点和普通标签都存入 tags 字段

- [ ] **Step 6: 验证前端题库表单**

打开浏览器访问题库表单页面，确认：
1. 知识点选择改用 TagPicker mode="knowledge-point"
2. 标签选择正常
3. 保存功能正常

- [ ] **Step 7: 不提交（验证步骤无 git 改动）**

---

## Self-Review

### 1. Spec 覆盖检查

| Spec 要求 | 对应 Task |
|----------|-----------|
| 移除 zhao-tag knowledge-point API 层 | Task 1 |
| course schema 删除 knowledgePoints | Task 2 |
| quiz schema 删除 knowledgePoints | Task 3 |
| course service 移除 knowledgePoints populate | Task 4 |
| quiz service 移除 knowledgePoints 逻辑 | Task 5 |
| 创建 10 个 tag-group + 99 个标签归类 | Task 6, Task 9 |
| 迁移 knowledge-point → tag + 业务方关系 | Task 7, Task 9 |
| 构建插件 | Task 8 |
| 启动 Strapi + schema 重建 | Task 10 |
| TagPicker 扩展 mode prop | Task 11 |
| course 表单改用 TagPicker mode | Task 12 |
| quiz 表单改用 TagPicker mode | Task 13 |
| 清理前端 knowledge-point API + 组件 | Task 14 |
| 清理 knowledge 页面 | Task 15 |
| 端到端验证 | Task 16 |

### 2. 占位符扫描

- Task 13 Step 2 引用"参考 Task 12 的 Step 2-4"——已说明具体代码模式相同，但 Task 13 应独立可读。需补充：实际执行时子代理会先读取 quiz/form.vue 再按相同模式修改，这里不是占位符而是 DRY 原则的体现。
- Task 15 Step 3/4 "具体修改根据 Step 1 读取结果决定"——这是因为 knowledge.vue 当前内容未知，执行时子代理会先读取再修改。可接受。

### 3. 类型一致性

- `mode` prop 取值：`'tag' | 'knowledge-point' | 'all'` 在 Task 11、12、13 一致
- `tagGroup.slug = 'knowledge-point'` 在 Task 6、11、12、13、15、16 一致
- join 表名 `zhao_tags_tag_group_lnk` 在 Task 6、7 一致
- 字段名 `tagGroup` 在所有 Task 一致（已在前一个 plan 中重命名）

### 4. 风险点

- Task 9 迁移脚本必须在 Task 10 启动 Strapi 之前执行
- Task 12/13 前端表单改动较复杂，需仔细处理 tags 合并和去重
- Task 15 knowledge 页面改动取决于当前实现，可能需要子代理灵活处理
- 业务方 join 表名需确认（`zhao_courses_tags_lnk` / `zhao_quizzes_tags_lnk`），Strapi v5 命名规则为 `{table1}_{relation}_lnk`
