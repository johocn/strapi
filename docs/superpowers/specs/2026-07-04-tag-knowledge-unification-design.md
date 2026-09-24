# 标签与知识点统一架构设计

## 目标

将知识点统一为 zhao-tag 中"知识点"分组的标签，消除 tag 与 knowledge-point 双轨制，简化业务方关系，前端组件统一为"左侧分组 + 右侧标签"模式。

## 背景

### 现状矛盾

1. **双轨制**：tag 和 knowledge-point 是两个独立 content-type，业务方（course/quiz）需同时维护 `tags` 和 `knowledgePoints` 两个关系
2. **数据稀疏**：knowledge-point 表仅 2 条记录（test-kp、JavaScript基础），无业务价值
3. **组件冗余**：前端有 TagPicker.vue 和 KnowledgePointPicker.vue 两个独立组件，逻辑重复
4. **schema 复杂**：course 有 tags + knowledgePoints 两个关系，quiz 同样，过滤查询需分别处理

### 统一原则

**知识点 = zhao-tag 中"知识点"分组的标签**

- 知识点不再是独立 content-type，而是特定分组的 tag
- 业务方只需维护 `tags` 一个关系
- 前端通过 `mode` prop 区分标签选择/知识点选择

## 架构

### 数据模型

#### tag-group 新增"知识点"分组

| 字段 | 值 |
|------|-----|
| name | 知识点 |
| slug | knowledge-point |
| description | 课程知识点标签 |

通过 slug 标识"知识点"分组，前端按 slug 过滤。

#### tag-group 完整种子数据（10 个分组）

| name | slug | description |
|------|------|-------------|
| 金融理财 | finance | 理财、投资、保险等金融标签 |
| 职场技能 | workplace | 沟通、领导力、项目管理等职场技能 |
| 生活健康 | lifestyle | 健康、运动、饮食等生活方式 |
| IT技术 | tech | 编程、前后端、AI、云计算等 |
| 产品设计 | design | 产品经理、UI/UX、用户体验等 |
| 学习路径 | learning | 入门/进阶/高级等学习阶段 |
| 考试认证 | certification | 考试、证书、学历等 |
| 兴趣爱好 | hobby | 设计、音乐、艺术等 |
| 其他 | other | 未分类标签 |
| 知识点 | knowledge-point | 课程知识点标签 |

#### knowledge-point content-type 处理

- **保留 schema 不删除**（避免破坏 Strapi schema 元数据）
- **移除 controller/service/routes**（停止对外 API）
- 已有数据迁移到 tag 表后，content-type 不再使用

### 业务方关系简化

#### course schema 改动

- **删除** `knowledgePoints` 关系
- **保留** `tags` 关系（manyToMany → plugin::zhao-tag.tag）
- 知识点通过 tags 关联（知识点就是 tag）

#### quiz schema 改动

- **删除** `knowledgePoints` 关系
- **保留/新增** `tags` 关系（manyToMany → plugin::zhao-tag.tag）
- 知识点通过 tags 关联

#### course-lesson schema

- 无改动（只有 tags 关系）

### 前端组件统一

#### TagPicker.vue 扩展

新增 `mode` prop：

```vue
<TagPicker mode="tag" />             <!-- 仅普通标签（排除知识点分组） -->
<TagPicker mode="knowledge-point" /> <!-- 仅知识点分组 -->
<TagPicker mode="all" />             <!-- 全部（默认） -->
```

**实现逻辑**：
- 加载 tag-groups 时记录 slug
- `mode="tag"`：过滤掉 `slug === "knowledge-point"` 的分组
- `mode="knowledge-point"`：只显示 `slug === "knowledge-point"` 的分组
- `mode="all"`：显示全部分组

#### KnowledgePointPicker.vue 废弃

- 知识点选择改为 `<TagPicker mode="knowledge-point" />`
- 删除独立的 KnowledgePointPicker.vue 组件
- 删除前端 knowledge-point 相关 API 调用

## 数据迁移

### Step 1: 创建 10 个 tag-group

通过 Knex 直接写入 `zhao_tag_groups` 表，确保 slug 正确。幂等性：name 存在则跳过。

### Step 2: 将 99 个现有 tag 归类到 9 个普通分组

按标签内容映射到对应分组，写入 join 表 `zhao_tags_tag_group_lnk`。知识点分组暂无标签。

**分组归类映射**（基于现有 99 个标签）：

| 分组 | 包含标签 |
|------|---------|
| 金融理财 | 理财、股票、信用卡、投资、外汇、期货、黄金、债券、税务、退休规划、风险管理、基金、保险、贷款、存款 |
| 职场技能 | 沟通、领导力、项目管理、时间管理、谈判、团队协作、演讲、写作、职业规划、职业发展、沟通技巧 |
| 生活健康 | 健康、运动、饮食、心理、旅行、摄影、美食、家居、亲子、社交、冥想、睡眠 |
| IT技术 | 编程、前端、后端、移动开发、人工智能、大数据、区块链、物联网、网络安全、自动化、云计算、架构设计、性能优化、算法基础、测试方法、安全防护、部署运维、故障排查、系统集成、数据处理 |
| 产品设计 | 产品经理、UI设计、交互设计、视觉设计、用户体验、需求分析、产品设计、市场营销、数据分析、业务分析 |
| 学习路径 | 入门、进阶、高级、专业、基础概念、核心原理、操作步骤、案例分析、常见问题、最佳实践、理论知识、实践技能、学习方法、工具使用 |
| 考试认证 | 考试、证书、学历、语言 |
| 兴趣爱好 | 设计、音乐、艺术 |
| 其他 | 春天、夏天、口腔、小米 |

### Step 3: 迁移 knowledge-point 数据到 tag

- JavaScript基础 → 创建 tag，归入"知识点"分组
- test-kp → 丢弃

### Step 4: 迁移业务方关系数据

**course.knowledgePoints → course.tags**：
1. 查询 `zhao_courses_knowledge_points_lnk` 关联表（Strapi v5 manyToMany join 表）
2. 对每条记录：找到旧 knowledge-point 对应迁移后的 tag（按 name 匹配）
3. 写入 `zhao_courses_tags_lnk`（course.tags 的 join 表）
4. 删除 `zhao_courses_knowledge_points_lnk` 记录

**quiz.knowledgePoints → quiz.tags**：
1. 查询 `zhao_quizzes_knowledge_points_lnk` 关联表
2. 同样迁移到 `zhao_quizzes_tags_lnk`
3. 删除旧关联

### Step 5: 删除业务方 knowledgePoints 关系（Strapi 启动后）

迁移脚本执行完后，业务方 schema 已删除 knowledgePoints 字段。Strapi 启动时检测到 schema 变更：
- 自动删除 `zhao_courses_knowledge_points_lnk` 和 `zhao_quizzes_knowledge_points_lnk` join 表
- 自动清理 `strapi_database_schema` 元数据

**注意**：Step 4 必须在 Strapi 启动前完成（join 表还存在时迁移数据），Step 5 由 Strapi 启动时自动处理。

如 Strapi 未自动清理 join 表，需手动执行：
```sql
DROP TABLE IF EXISTS zhao_courses_knowledge_points_lnk;
DROP TABLE IF EXISTS zhao_quizzes_knowledge_points_lnk;
```

## 改动清单

### zhao-tag 插件

#### 移除
- `controllers/knowledge-point.ts`
- `services/knowledge-point.ts`
- `routes/content-api.ts` 中的 knowledge-point 路由（公开 2 + 管理 5 = 7 条）
- `permissions.ts` 中的 `knowledge-point.*` 权限（4 条）

#### 保留
- `content-types/knowledge-point/schema.json`（不删除，避免破坏 schema 元数据）
- `content-types/index.ts` 中的 knowledge-point 注册（同上）

#### 新增
- `scripts/seed-tag-groups.js`（种子脚本：创建 10 个分组 + 归类 99 个标签）
- `scripts/migrate-knowledge-points.js`（迁移脚本：knowledge-point 数据 → tag）

### zhao-course 插件

#### schema 改动
- `content-types/course/schema.json`：删除 `knowledgePoints` 关系字段

#### service 改动
- `services/course.ts`：移除所有 `knowledgePoints` populate（约 4 处）
- 移除 knowledgePoints 相关过滤逻辑（如有）

#### controller 改动
- `controllers/course.ts`：移除 knowledgePoints 过滤参数处理（如有）

### zhao-quiz 插件

#### schema 改动
- `content-types/quiz/schema.json`：删除 `knowledgePoints` 关系字段
- 确保 `tags` 关系存在（manyToMany → plugin::zhao-tag.tag）

#### service 改动
- `services/quiz.ts`：移除 `knowledgePoints` populate（约 3 处）
- 移除 `findByKnowledgePoint` 方法（约 1 处）
- 统一用 `tags` 关系

### 前端

#### TagPicker.vue 扩展
- 新增 `mode` prop（tag/knowledge-point/all，默认 all）
- 加载 tag-groups 时按 mode 过滤

#### KnowledgePointPicker.vue 废弃
- 删除组件文件
- 替换所有引用为 `<TagPicker mode="knowledge-point" />`

#### API 调用清理
- `src/api/tag.js`：移除 knowledge-point 相关 API 调用
- `src/api/course.js`：移除 knowledgePoints 字段处理
- `src/api/quiz.js`：移除 knowledgePoints 字段处理

#### 页面修改
- `pages/course/form.vue`：知识点选择器改用 TagPicker mode="knowledge-point"
- `pages/quiz/form.vue`：同上
- `pages/tag/knowledge.vue`：废弃或重定向到标签管理页
- `pages/tag/knowledge-form.vue`：同上

## 风险与约束

1. **Strapi v5 schema 强制迁移**：删除 knowledgePoints 关系需删除 `strapi_database_schema` 元数据强制重建
2. **数据迁移顺序**：必须先迁移 knowledge-point 数据到 tag，再迁移业务方关系，最后删除关系字段
3. **join 表命名**：Strapi v5 manyToMany join 表命名为 `{table1}_{table2}_lnk`，需确认实际表名
4. **前端兼容**：TagPicker mode prop 需向后兼容（默认 all）
5. **knowledge-point content-type 保留**：schema 保留但不使用，未来可考虑彻底删除

## 验收标准

1. tag-groups 表有 10 条记录（含知识点分组，slug 正确）
2. 99 个现有 tag 全部归类到 9 个普通分组（知识点分组暂无标签）
3. JavaScript基础 已迁移为 tag，归入"知识点"分组
4. course schema 无 knowledgePoints 字段，tags 关系正常
5. quiz schema 无 knowledgePoints 字段，tags 关系正常
6. 业务方关系数据已迁移（旧 knowledgePoints 关联转为 tags 关联）
7. 前端 TagPicker 支持 mode prop，知识点选择器正常工作
8. KnowledgePointPicker.vue 已删除，所有引用已替换
9. 课程/题库表单页面知识点选择功能正常
