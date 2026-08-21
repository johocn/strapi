# 题库考试功能 — shao 听课端设计文档

- 日期：2026-08-19
- 范围：shao（听课端 HBuilder 工程）+ zhao-quiz 后端（最小改动）
- 状态：设计已确认，待评审

## 一、背景与现状

后端 `zhao-quiz` 插件已具备完整能力：

- **题库**（`quiz`）：题型（单选/多选/判断/填空/简答/问答）、难度、分值、解析，关联课程/课时/知识点 tags、自选关联
- **课时测验**：`getQuizByLesson` / `startQuiz` / `checkQuizAnswer` / `claimQuizPoints`，课程级 `allowRetakeQuiz` / `quizRetryCount` 控制重试与积分
- **刷题练习**：`getQuizQuestionList` + `submitQuizPracticeAnswer`（practice/practiceType）
- **模拟考试**：`quiz-exam` + `paper`（答题卡/倒计时/交卷）/ `startQuizExam` / `submitQuizExam`
- **错题集**：`getWrongQuizList` / `getWrongQuizDue`（记忆曲线复习，主动/到期出队）
- **答题记录**：`getMyQuizRecords`

shao 听课端已有页面与入口：

| 页面 | path | 入口 |
|---|---|---|
| 课时测验 | `pages/quiz/quiz.vue` | 播放页「去答题」（随课时 quizzes 关联显隐） |
| 刷题练习 | `pages/quiz/practice.vue` | profile「刷题练习」 |
| 模拟考试 | `pages/quiz/exam/index.vue` | profile「模拟考试」 |
| 错题集 | `pages/wrong-quiz/index.vue` | profile「错题集」 |

课程实体已有可扩展 JSON 字段 `featureFlags`（customField `plugin::zhao-course.featureFlags`），**只写 C 端即可控制课程级功能开关，无需改库**。

现有缺陷（F 节汇总）：练习页题型/状态、知识点过滤、入口一致性等，见下文。

## 二、目标（用户清单 → 页面对应）

| 需求 | 落点 |
|---|---|
| 课程 | 课程详情 + 播放页门控入口 |
| 练习 | practice.vue（已有）+ 统一入口 |
| 考试 | exam/index.vue（已有）+ 门控 + 统一入口 |
| 错题 | wrong-quiz/index.vue（已有）+ 门控 |
| 自由答题 | practice.vue 新增 `free` 模式 |
| 随机抽题 | practice.vue 新增 `random` 用例/N 题一轮配置 |
| 考试 | 复用现有 exam，补齐课程门控与入口一致 |

## 三、设计决策（已确认）

### B 节 — 课程门控与入口关系（0C 成本，不改数据库）

**开关存储**：复用课程 `featureFlags` JSON，扩展 `quiz` 子对象（新增 key，旧数据缺省按"未配置=不展示独立入口"处理，向后兼容）。形状：

```jsonc
{
  "learnRoles": ["instructor", "user"],   // 允许学习/可见该课程的角色码白名单（存课程级）
  "quiz": {
    "practice": true,     // 本课/课程刷题入口
    "lessonQuiz": true,   // 课堂测验（原「去答题」）
    "exam": true,         // 模拟考试入口
    "examRoles": ["instructor"],  // 仅这些角色可见考试/试卷（独立于 learnRoles）
    "freeAnswer": true,   // 自由答题入口
    "random": true        // 随机抽题入口
  }
}
```

在现有 `utils/player-features.ts` 基础上扩展 `parseCourseFeatureFlags`，新增 `quiz` 容错解析（递归合并默认关闭）与 `learnRoles` 解析。

**入口关系（核心）**：统一采用 **「开关 && 有内容」双重判断**，先判断相关题目数量再显隐入口，避免"开了开关却无题可答"。

- **课时测验（课堂测验）**：保留播放页「去答题」按钮，显隐条件 = `quiz.lessonQuiz` 开关 && 当前课时 `quizzes` 关联非空（即有测验题）。
- **本课/课程刷题**：课程详情 / 播放页新增入口，显隐 = `quiz.practice` 开关 && 课程（或课时）关联题库至少 1 题。
- **模拟考试**：课程详情 / profile 入口，显隐 = `quiz.exam` 开关 && 课程关联 `quiz-exam` 至少 1 份卷（profile 级用全局开关 + 有卷）。

**二者关系结论**：课时测验是"随堂锚点"，库级刷题/自由答题/随机抽题是"独立能力"，互不取代；均受相应开关+内容门控，不产生重复入口。

### C 节 — 独立模式（practice.vue 扩展，前端为主）

`practice.vue` 现有 `Mode = 'knowledge' | 'random' | 'wrong'`。扩展：

```text
Mode 扩充：
  free  自由答题：可选范围（全库/课程/课时/知识点）→ 连续作答，逐题反馈
  random 随机抽题：可配置随机抽 N 题 / 一轮（默认沿用 20 题），支持交卷统计
```

- 数据复用现有 `getQuizQuestionList({ course, lesson, knowledgePoint })` + `submitQuizPracticeAnswer`。
- `free` 与 `random` 主要前端组合参数差异，后端仅需确认 `getQuizQuestionList` 是否支持知识点过滤（见 D 节），**不改后端或最小改**。
- 页面支持 `?mode=free/random&course=... &lesson=...&kp=...` 路由参数进入，便于统一入口直通。

### D 节 — 知识点刷题修复

现有 `mode='knowledge'` 与实际未真正按知识点过滤，需：
- `getQuizQuestionList` 透传知识点过滤（tags 知识点 documentId）。
- `practice.vue` 在 `mode='knowledge'` 时携带知识点参数，列表页/课程详情提供知识点选择后跳转。

### E 节 — 统一入口打通

| 位置 | 新增/调整入口 | 门控 |
|---|---|---|
| 课程详情 `course-detail.vue` | 本课刷题 / 自由答题 / 随机抽题 / 模拟考试 按钮 | 课程 `quiz.*` 开关 && 有内容 |
| 播放页 `video-player.vue` | 保留「去答题」（课堂测验）；新增本课自由/随机入口 | 同上 |
| profile | 已有刷题练习/模拟考试/错题集；无独立改库即可稳定 | 沿用现有 |

### F 节 — 现有缺陷修复清单

- 练习页 `mode='knowledge'` 知识点过滤缺失（D 节）。
- 播放页「去答题」入口当前仅按课时 quizzes 存在显隐，需并入 `quiz.lessonQuiz` 开关判断。
- 入口文案/路由与权限（游客 vs 登录）一致性检查。
- 其余以实现期回归为准，逐一记录到 plan。

### G 节 — 角色可见/可学门控（zhaoRoles + 后端过滤）

**角色判定来源**：用户 `zhaoRoles` 角色码（如 `instructor`/`user`/`channel-admin`/`admin`）。
**配置位置**：课程 `featureFlags` 的 `learnRoles`（课程可见/可学）与 `quiz.examRoles`（考试/试卷可见）。

**判定规则（统一函数 `hasGrantedRole(userRoles, whitelist)`）**：`admin` 恒放行；否则 `userRoles` 与白名单有交集即放行；白名单为空/未配置=不启用角色门控（前后兼容）。

**课程可见/可学（后端过滤，真正不可见）**：
- `learnRoles` 已配置时，`zhao-course` 课程列表接口（`/zhao-course/v1/courses`、`/my/courses`）在现有 `channelScope` 渠道过滤基础上，追加角色过滤：非授权角色课程不出现在列表；详情接口对非授权角色返回 403/隐藏。
- 未配置 `learnRoles` 时行为与现状一致。

**考试/试卷可见（独立角色 examRoles）**：
- 前端：课程详情/profile 的考试入口、试卷列表按 `quiz.examRoles` + `getMyRoles()` 门控显示（仅授权角色可见）。
- 后端：考试/试卷相关接口（`/zhao-quiz/.../exam*`）在 examRoles 配置时按用户 zhaoRoles 校验，未授权统一 403，避免绕过前端。

## 四、非目标 / 约束

- 不新增后端数据模型；优先复用 zhao-quiz 现有接口。
- 后端改动收敛到两处单点：`zhao-course` 课程列表/详情角色过滤、`zhao-quiz` 知识点透传与考试角色校验；均跟随现有构建+重启流程。
- 不引入新的 C 端依赖。

## 五、实现分期建议

1. P1：`player-features.ts` 扩展 `quiz` 门控解析 + 临时手改课程 featureFlags 验证门控显隐。
2. P2：practice.vue 扩展 `free` / `random` 模式 + 统一入口（详情/播放页）打通。
3. P3：知识点刷题修复 + 缺陷回归。
4. P4：全链路验收（开关、内容门控、游客/登录权限、积分/错题流转）。