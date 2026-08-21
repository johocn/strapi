# 课程续学推荐 设计文档

> 日期：2026-08-22
> 状态：已确认设计，进入实施计划

## 一、目标与范围

**目标**：为已学过课程的用户提供"进阶 / 续学 / 相似"课程推荐，形成个人化续学路径，差异化于现有的兴趣式"猜你喜欢"。

**本轮最小闭环**：
- 后端：新增续学推荐引擎 + 两个 `/v1` 接口
- shao 前端：课程详情页"进阶课程"区块 + 学习中心（我的课程）个人续学清单

**不纳入本轮**：
- 课程中心入口、序列管理后台配置、推荐结果落库

## 二、推荐引擎（zhao-course `recommend` service）

核心为内存打分函数 `scoreCandidate(seed, candidate)`，不落库、不新增依赖、不写 schema。

**level 递进映射**：
```
introductory < foundation < advanced < professional
```

**打分与排序规则（分数越高越靠前）**：
1. **序列续学**（最高权）：`seed.sequenceTag` 与候选相同 且 `enforceSequence`，按 `sequenceNumber` 推荐下一门
2. **同分类 level 递进**：候选分类 === seed 分类，且候选 level 高于 seed level 权重次之；同级作为巩固候选最低
3. **tags / keywords 重叠数**：候选与 seed 的 tags（uuid 集合）及 keywords（json 数组）重叠数量作为附加分
4. **平手兜底**：`studentCount` 降序

**恒定过滤**：
- 候选必须是 `status=published`
- 排除候选 === seed 自身
- 排除用户已报名课程（enrollment status=enrolled）

**兜底**：无学习记录 / 无任何候选中，返回最新（`createdAt` 降序）或热门（`studentCount` 降序）课程，保证接口永远可用。

## 三、后端接口

两接口共享同一引擎，均走 `plugin::zhao-course` content-api 路由；需新增 `recommend` controller + service，并在 `controllers/index.ts`、`services/index.ts` 注册。

### 接口 1：课程详情续学
- `GET /v1/courses/:documentId/related`（公开，`publicChannelScopeRoute`）
- seed = 当前课程，返回进阶/续学/相似课程列表
- 无登录要求；未传用户上下文时不排除已报名（或仅按公开过滤）

### 接口 2：学习中心个人续学清单
- `GET /v1/my/course-suggestions`（登录，`userRoute`）
- seed 集合界定：优先取用户 `enrollment status=enrolled` 且对应 `course-progress.progress < 100` 的在学课程；若全为已完课或无报名，则回退取最近 1 门已学课程
- 聚合候选后全局去重、排除已报名，score 取该候选对应各 seed 的最高分，返回 Top N

**统一返回 rows 字段契约**（前端照用）：
```json
[
  {
    "documentId": "...",
    "id": 1,
    "title": "进阶课程名",
    "category": "分类名",
    "cover": null,
    "price": 0,
    "isFree": true,
    "courseType": "free",
    "level": "intermediate",
    "difficulty": "intermediate",
    "studentCount": 88,
    "sequenceNext": false,
    "score": 12,
    "seedId": 3
  }
]
```
- `sequenceNext: true` 表示命中序列续学最高信号，前端可打标
- `seedId` 指明由哪个已学课程派生，学习中心可分组展示

## 四、shao 前端

### 课程详情页（`pages/course-detail/course-detail.vue`）
- 底部新增"进阶课程 / 继续学习"横滑区块，调 `GET /v1/courses/:documentId/related`
- 无数据则不渲染区块

### 学习中心（`pages/my-course/my-course.vue`）
- 新增"我的续学推荐"区块，调 `GET /v1/my/course-suggestions`
- 展示课程卡片（封面/标题/level/价格标签），`sequenceNext` 命中项打"进阶续学"标

## 五、错误处理与容错

- 无候选 → 返回 `{ data: [] }`，200，不报错
- 未登录调学习中心接口 → 401（走 `userRoute`）
- tags/keywords 数据稀疏时重叠分弱 → 由 level + sequence 主导排序保证可用

## 六、风险点

- tags/keywords 质量不均，相似度信号不稳定 → 仅作附加分，主排序依赖 level/sequence
- `level` 枚举存在缺省（introductory）→ 递进映射需容错，未知 level 按最末级不额外加分
- 学习中心 seed 聚合需做全局去重，避免同一候选被多 seed 拉高重复出现

## 七、验收要点

- 引擎单元级断言：同分类更高 level 优先、sequenceNext 最高优先、tags 重叠加分、已报名与自身排除
- 两接口端到端：published 过滤、兜底返回、字段契约一致
- 前端：详情页区块渲染、学习中心清单渲染、空态隐藏