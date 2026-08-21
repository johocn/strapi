# 题库考试功能 shao 听课端 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 shao 听课端实现课程门控 + 统一答题入口 + 自由答题/随机抽题模式 + 知识点刷题修复，后端改动最小。

**Architecture:** 复用课程 `featureFlags` JSON 做课程级功能门控（只写 C 端解析）；在 `practice.vue` 扩展 `free/random` 模式复用现有题库接口；课程详情/播放页新增「开关 && 有内容」双判断入口。后端仅在 `zhao-quiz` 需要时单点透传知识点过滤。

**Tech Stack:** uni-app (Vue3 + TS)、zhao-quiz Strapi 插件、HBuilder 构建 + pm2 部署 shao。

设计与实现规约依据：`docs/superpowers/specs/2026-08-19-quiz-exam-shao-design.md`。

---

### Task 1: 扩展 `parseCourseFeatureFlags` 支持 quiz 门控

**Files:**
- Modify: `e:\code\shao\utils\player-features.ts`

- [ ] **Step 1: 增加 `CourseQuizFlags` 类型与接口字段**

在 `CourseFeatureFlags` 接口追加 `quiz` 字段，并新增类型：

```ts
export interface CourseQuizFlags {
  practice: boolean     // 本课/课程刷题入口
  lessonQuiz: boolean   // 课堂测验（原「去答题」）
  exam: boolean         // 模拟考试入口
  freeAnswer: boolean   // 自由答题入口
  random: boolean       // 随机抽题入口
  examRoles: string[]   // 仅这些角色可见考试/试卷（独立于 learnRoles）
}

export interface CourseFeatureFlags {
  configured: boolean
  playbackSpeed: boolean
  allowLandscape: boolean
  screenLock: boolean
  autoNext: boolean
  pictureInPicture: boolean
  vipSpeedOverride: boolean
  seekMode: SeekMode
  learnRoles: string[]  // 允许学习/可见该课程的角色码白名单（空=不启用角色门控）
  quiz: CourseQuizFlags
}

/** 判定用户是否命中角色白名单：admin 恒放行；白名单空=放行；否则交集 */
export function hasGrantedRole(userRoles: string[], whitelist: string[]): boolean {
  if (!Array.isArray(whitelist) || whitelist.length === 0) return true
  const roles = Array.isArray(userRoles) ? userRoles : []
  if (roles.includes('admin')) return true
  return roles.some((r) => whitelist.includes(r))
}
```

- [ ] **Step 2: 在 `parseCourseFeatureFlags` 返回 quiz 容错解析**

构造时并入 quiz 子对象（缺省全部关闭，向后兼容）：

```ts
  const quizRaw = isObject && ff.quiz && typeof ff.quiz === 'object' && !Array.isArray(ff.quiz)
    ? (ff.quiz as Record<string, any>)
    : {}
  const rolesOf = (v: any) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [])
  return {
    configured,
    playbackSpeed: ff.playbackSpeed === true,
    allowLandscape: ff.allowLandscape === true,
    screenLock: ff.screenLock === true,
    autoNext: ff.autoNext === true,
    pictureInPicture: ff.pictureInPicture === true,
    vipSpeedOverride: ff.vipSpeedOverride === true,
    seekMode: configured
      ? (ff.seekMode === 'locked' || ff.seekMode === 'free' || ff.seekMode === 'played_only'
        ? (ff.seekMode as SeekMode)
        : DEFAULT_SEEK_MODE)
      : 'free',
    learnRoles: rolesOf(ff.learnRoles),
    quiz: {
      practice: quizRaw.practice === true,
      lessonQuiz: quizRaw.lessonQuiz === true,
      exam: quizRaw.exam === true,
      freeAnswer: quizRaw.freeAnswer === true,
      random: quizRaw.random === true,
      examRoles: rolesOf(quizRaw.examRoles),
    },
  }
```

- [ ] **Step 3: 验证**

在 `e:\code\shao` 运行类型检查并编译验证：

Run: `npx vue-tsc --noEmit -p tsconfig.json`（若工程无 vue-tsc，则 HBuilder 构建一次确认无 TS 报错）
Expected: 无新增类型错误；`course.getFeatureFlags()` 解析含 `quiz` 各开关。

- [ ] **Step 4: Commit**

```bash
git -C e:/code/shao add utils/player-features.ts
git -C e:/code/shao commit -m "feat: add quiz gating flags to course featureFlags parser"
```

---

### Task 2: 播放页「去答题」并入 quiz.lessonQuiz 门控

**Files:**
- Modify: `e:\code\shao\pages\video-player\video-player.vue`

- [ ] **Step 1: 定义是否需要显示「去答题」按钮的 computed**

在 `hasQuiz` computed（约 L386）附近补充门控：

```vue
const ff = ref<ReturnType<typeof parseCourseFeatureFlags>>(DEFAULT_FLAGS)
const showLessonQuiz = computed(() => !!(ff.value.quiz?.lessonQuiz) && hasQuiz.value)
```

`DEFAULT_FLAGS` 在 import 后定义，作为无课程数据时的安全默认：

```ts
const DEFAULT_FLAGS = parseCourseFeatureFlags(null)
```

- [ ] **Step 2: 替换「去答题」/答题按钮的显隐条件**

将常驻答题按钮（约 L41-47 `v-if="hasQuiz"`）改为用 `showLessonQuiz`；`quizButtonText` 与打开逻辑沿用现有，仅保证入口被门控。

- [ ] **Step 3: 验证**

播放配置了 `featureFlags.quiz.lessonQuiz=true` 且课时含 quizzes 的课程 → 显示答题入口；关闭 `lessonQuiz` → 不显示（即使有题）。
Run: HBuilder 运行到 H5，翻看两个课程对比。

- [ ] **Step 4: Commit**

```bash
git -C e:/code/shao add pages/video-player/video-player.vue
git -C e:/code/shao commit -m "feat: gate lesson quiz entry by quiz.lessonQuiz flag"
```

---

### Task 3: practice.vue 扩展 free / random 模式

**Files:**
- Modify: `e:\code\shao\pages\quiz\practice.vue`

- [ ] **Step 1: 扩展 Mode 与路由参数解析**

```ts
type Mode = 'knowledge' | 'random' | 'free' | 'wrong'
// 新增范围参数
const lessonDocumentId = ref('')
const kpDocumentId = ref('')
const freeRange = ref<'all' | 'course' | 'lesson' | 'knowledge'>('course')

onLoad((query) => {
  const m = (query as any)?.mode
  if (m === 'knowledge' || m === 'free' || m === 'wrong') mode.value = m
  else mode.value = 'random'
  courseDocumentId.value = (query as any)?.course ?? ''
  lessonDocumentId.value = (query as any)?.lesson ?? ''
  kpDocumentId.value = (query as any)?.kp ?? ''
  if (lessonDocumentId.value) freeRange.value = 'lesson'
  else if (kpDocumentId.value) freeRange.value = 'knowledge'
})
```

- [ ] **Step 2: loadQuestions 按模式组参数**

在 `onLoad` 内根据 mode 调整标题，并在 `loadQuestions` 的非 wrong 分支按范围组装过滤：

```ts
const res: any = lessonDocumentId.value
  ? await getQuizQuestionList({ lessonDocumentId: lessonDocumentId.value })
  : kpDocumentId.value
    ? await getQuizQuestionList({ courseDocumentId: courseDocumentId.value || undefined, knowledgePointDocumentId: kpDocumentId.value })
    : await getQuizQuestionList({ courseDocumentId: courseDocumentId.value || undefined })
```

- [ ] **Step 3: 结果页/模式展示适配**

`mode='free'` 时收藏题在进出时用 `submitQuizPracticeAnswer({ ..., mode:'practice', practiceType:'free' })`（沿用现有 practiceType 枚举，services/api.ts 增加 `'free'`）。结果页对 `free/random` 使用既有「随机刷题」文案分支，不强制指向错题。

- [ ] **Step 4: 验证**

H5 运行：`?mode=free&course=<id>` 进入自由答题、`?mode=random&lesson=<id>` 进入单课时随机抽题，均可逐题作答并获反馈。

- [ ] **Step 5: Commit**

```bash
git -C e:/code/shao add pages/quiz/practice.vue
git -C e:/code/shao commit -m "feat: add free/random modes to practice page"
```

---

### Task 4: api.ts 透传知识点过滤

**Files:**
- Modify: `e:\code\shao\services\api.ts`

- [ ] **Step 1: `getQuizQuestionList` 支持 knowledgePointDocumentId**

```ts
export function getQuizQuestionList(params: { courseDocumentId?: string; lessonDocumentId?: string; knowledgePointDocumentId?: string; pageSize?: number } = {}) {
  const paramsBuilder = new URLSearchParams()
  if (params.courseDocumentId) paramsBuilder.append('courseDocumentId', params.courseDocumentId)
  if (params.lessonDocumentId) paramsBuilder.append('lessonDocumentId', params.lessonDocumentId)
  if (params.knowledgePointDocumentId) paramsBuilder.append('knowledgePointDocumentId', params.knowledgePointDocumentId)
  if (params.pageSize) paramsBuilder.append('pageSize', String(params.pageSize))
  paramsBuilder.append('populate[tags]', 'true')
  return request(`/zhao-quiz/v1/quizzes?${paramsBuilder.toString()}`)
}
```

- [ ] **Step 2: 后端单点确认知识点过滤**

核验 `zhao-quiz` 的 `quizzes` 查询（server/service/core-quiz）是否已支持按 tags 知识点 documentId 过滤。若缺失，按文档 D 节在查询处透传并复用 strapi documents `tags` 关系过滤（对应 `quiz-batch.ts` 中知识点解析契约）。此处为最小改动，需先跑服务确认。

- [ ] **Step 3: 验证**

带 `knowledgePointDocumentId` 请求 `/zhao-quiz/v1/quizzes`，仅返回关联该知识点的题目。

- [ ] **Step 4: Commit**

```bash
git -C e:/code/shao add services/api.ts
git -C e:/code/shao commit -m "feat: pass knowledge point filter to quiz list"
```

---

### Task 5: 课程详情/播放页统一入口（开关 && 有内容）

**Files:**
- Modify: `e:\code\shao\pages\course-detail\course-detail.vue`
- Modify: `e:\code\shao\pages\video-player\video-player.vue`

- [ ] **Step 1: course-detail 增加门控入口 computed**

在课程数据加载后解析 `featureFlags.quiz`，并用「是否有题/卷」做内容门控：

```ts
const courseQuizFlags = computed(() => parseCourseFeatureFlags(course.value?.featureFlags).quiz)
const showPractice = computed(() => !!(courseQuizFlags.value.practice && (course.value?.quizzes?.length ?? 0) > 0))
const showExam = computed(() => !!(courseQuizFlags.value.exam && (course.value?.exams?.length ?? 0) > 0))
const showFreeAnswer = computed(() => !!(courseQuizFlags.value.freeAnswer && (course.value?.quizzes?.length ?? 0) > 0))
```

- [ ] **Step 2: 绘制入口按钮**

在课程详情操作区渲染按钮，分别 `navigateTo`：

```vue
<button v-if="showPractice" class="entry-btn" @click="go('/pages/quiz/practice?mode=random&course=' + course.documentId)">课程刷题</button>
<button v-if="showFreeAnswer" class="entry-btn" @click="go('/pages/quiz/practice?mode=free&course=' + course.documentId)">自由答题</button>
<button v-if="showExam" class="entry-btn" @click="go('/pages/quiz/exam/index?course=' + course.documentId)">模拟考试</button>
```

`go(url)` 用封装跳转（统一处理登录态，参考现有按钮跳转方式）。

- [ ] **Step 3: video-player 新增本课自由/随机入口**

在无课时测验时也允许展示课程级练习入口，显隐 = `quiz.freeAnswer/random` && 课程 quizzes 非空：

```vue
<button v-if="hasQuiz && ff.value.quiz?.freeAnswer" @click="openFreePractice">📝 自由答题</button>
```

`openFreePractice` 跳 `?mode=free&lesson=<currentLesson.documentId>`。

- [ ] **Step 4: 验证**

配置 `featureFlags.quiz={practice:true,freeAnswer:true,exam:true}` 且有题/卷的课程：详情页显示课程刷题/自由答题/模拟考试；关闭对应开关后入口消失；无题课程即使开关开启也不显示。

- [ ] **Step 5: Commit**

```bash
git -C e:/code/shao add pages/course-detail/course-detail.vue pages/video-player/video-player.vue
git -C e:/code/shao commit -m "feat: gated unified quiz entries in course detail and player"
```

---

### Task 6: 知识点刷题修复 + 缺陷回归

**Files:**
- Modify: `e:\code\shao\pages\quiz\practice.vue`（mode=knowledge 传知识点）
- Modify: `e:\code\shao\pages\wrong-quiz\index.vue`、`profile.vue`（入口一致性，仅门控时保持）

- [ ] **Step 1: 提供知识点入口**

在课程详情/或专门入口传 `?mode=knowledge&course=<id>&kp=<documentId>`；`practice.vue` 在 `mode='knowledge'` 分支已按 Task 3 的规则携带知识点过滤，确保真正按知识点出题。

- [ ] **Step 2: 缺陷回归清单**

逐项核对并修复：
- 练习页 `mode='knowledge'`：确认携带知识点参数后仅出该知识点题目（Task 3 联动验证）。
- 播放页「去答题」已由 Task 2 接入 `quiz.lessonQuiz`。
- 游客态入口跳转需引导登录（沿用现有 `requireLogin` 封装）。

- [ ] **Step 3: 全链路验收脚本清单**

| 场景 | 期望 |
|---|---|
| 课程开关开启+有题 | 详情/播放均显示对应入口 |
| 课程开关关闭 | 入口隐藏 |
| 开关开启但无题/无卷 | 入口隐藏（内容门控） |
| 自由答题作答 | 逐题反馈、正确率统计 |
| 随机抽题 N 题一轮 | 交卷统计 |

- [ ] **Step 4: Commit**

```bash
git -C e:/code/shao add pages/quiz/practice.vue pages/wrong-quiz/index.vue pages/profile/profile.vue
git -C e:/code/shao commit -m "fix: knowledge point filtering and entry consistency"
```

---

### Task 7: zhao-course 课程列表/详情角色过滤（learnRoles 后端真正不可见）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-course\server\src\services\course.ts`（find/findOne 内存过滤段）
- Modify: `e:\code\basic\plugins\zhao-course\server\src\services\user-course-auth.ts`（my/courses 同样过滤）

- [ ] **Step 1: 增加按用户 zhaoRoles 读取的辅助函数**

在 course service 顶部新增读取当前用户角色码的辅助（复用 channel-permission 的角色取法）：

```ts
async function resolveUserRoles(userId?: number): Promise<string[]> {
  if (!userId) return []
  const user: any = await strapi.db.query("plugin::users-permissions.user").findOne({
    where: { id: userId },
    populate: {},
  })
  const raw = Array.isArray(user?.zhaoRoles) ? user.zhaoRoles : []
  return raw.filter((r: any) => typeof r === "string")
}

function hasGrantedRole(userRoles: string[], whitelist: string[]): boolean {
  if (!Array.isArray(whitelist) || whitelist.length === 0) return true
  if (userRoles.includes("admin")) return true
  return userRoles.some((r) => whitelist.includes(r))
}
```

- [ ] **Step 2: find 内存过滤追加 learnRoles 门控**

在 `find` 的 `filteredList = list.filter(...)`（渠道过滤之后）追加角色过滤（仅非游客且非 admin 时，且课程配置了 `learnRoles`）：

```ts
    const userRoles = await resolveUserRoles(channelScope && !channelScope.isGuest ? (query as any)._userId : undefined)
    if (!channelScope?.isGuest && channelScope && !channelScope.all) {
      filteredList = filteredList.filter((course: any) => {
        const learn = Array.isArray(course.featureFlags) || (course.featureFlags && typeof course.featureFlags === 'object')
          ? course.featureFlags?.learnRoles
          : undefined
        return hasGrantedRole(userRoles, learn && Array.isArray(learn) ? learn : [])
      })
    }
```

若 `featureFlags` 为 JSON 对象日常存储，直接取 `course.featureFlags?.learnRoles`；如为字符串先 JSON.parse 容错。

- [ ] **Step 3: findOne 对非授权角色返回 403**

在 `findOne` 非 admin 分支，取到课程后校验 `learnRoles`，不通过则抛 403：

```ts
    const learn = course?.featureFlags?.learnRoles
    if (!isAdmin && !hasGrantedRole(await resolveUserRoles(_userId), Array.isArray(learn) ? learn : [])) {
      const err: any = new Error("无权查看该课程")
      err.status = 403
      throw err
    }
```

- [ ] **Step 4: my/courses 同步角色过滤**

在 `user-course-auth.find` 返回前对列表做同样 `learnRoles` 过滤。

- [ ] **Step 5: 验证**

服务改后 `npm run build` 重启；拟配置 `learnRoles:["instructor"]` 的课程：用 `user` 角色账号调用 `/zhao-course/v1/courses` 不出现该课程，`/courses/:id` 返回 403；`instructor` 账号正常可见。管理员不受限。

- [ ] **Step 6: Commit**

```bash
git -C e:/code/basic add plugins/zhao-course/server/src/services/course.ts plugins/zhao-course/server/src/services/user-course-auth.ts
git -C e:/code/basic commit -m "feat: role-gate course list/detail by learnRoles"
```

---

### Task 8: 考试/试卷角色门控（examRoles，前后端）

**Files:**
- Modify: `e:\code\shao\pages\course-detail\course-detail.vue` / `pages\quiz\exam\index.vue`
- Modify（后端校验，如有）: `zhao-quiz` 考试相关 controller/service

- [ ] **Step 1: 前端考试入口/列表按 examRoles + getMyRoles 门控**

课程详情在 Task 5 的 `showExam` 基础上追加角色校验：

```ts
const myRoles = ref<string[]>([])
onMounted(async () => { try { myRoles.value = await getMyRoles() } catch { myRoles.value = [] } })
const showExam = computed(() =>
  !!(courseQuizFlags.value.exam &&
    (course.value?.exams?.length ?? 0) > 0 &&
    hasGrantedRole(myRoles.value, courseQuizFlags.value.examRoles)))
```

`profile.vue`「模拟考试」入口在同一课程上下文无 featureFlags 时保持不变（沿用现状态）。

- [ ] **Step 2: 后端 exam 接口角色校验**

在 `zhao-quiz` 考试 query 处，当课程有 `quiz.examRoles` 时按用户 zhaoRoles 校验，未授权返回 403（复用 `resolveUserRoles`/`hasGrantedRole` 同款逻辑，位置贴合现有 controller/service）。此处为最小改动，先核验考试 route 上下文拿到的用户角色。

- [ ] **Step 3: 验证**

`quiz.examRoles:["instructor"]` 课程：`user` 角色不显示考试入口、直连 exam 接口 403；`instructor` 可见可考。

- [ ] **Step 4: Commit**

```bash
git -C e:/code/shao add pages/course-detail/course-detail.vue pages/profile/profile.vue
git -C e:/code/basic add plugins/zhao-quiz/server/src/...
git -C e:/code/basic commit -m "feat: role-gate exam/paper by examRoles"
git -C e:/code/shao commit -m "feat: gate exam entry by examRoles role"
```

---

## Self-Review

- **Spec coverage（设计文档）：** B 节门控与入口关系 → Task 1/2/5；C 节 free/random → Task 3/4；D 节知识点修复 → Task 4/6；E 节统一入口 → Task 5；F 节缺陷 → Task 2/6；G 节角色可见/可学门控 → Task 1（learnRoles/examRoles 解析）、Task 7（课程后端过滤）、Task 8（考试角色门控）。覆盖设计全部节。
- **Placeholder 扫描：** 无 TBD/“待补充”；所有代码步骤给出具体实现。Task 4 后端步骤以“先核验是否存在过滤”的方式给出确定路径与改动方向，不预留空实现。
- **类型一致性：** `parseCourseFeatureFlags().quiz` 在 Task 1 定义 `CourseQuizFlags`，Task 2/5 均按 `ff.value.quiz?.lessonQuiz` / `courseQuizFlags.value.practice` 访问，字段名 `practice/lessonQuiz/exam/freeAnswer/random` 全局一致；`getQuizQuestionList` 参数名 `knowledgePointDocumentId` 在 Task 4 定义、Task 3/6 引用一致。