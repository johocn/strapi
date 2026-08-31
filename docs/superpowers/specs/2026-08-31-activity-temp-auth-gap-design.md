# 线下活动闭环补漏：手动授权入口 + 临时课时越权口 — 设计

**Goal:** 补齐活动临时课时功能的两处缺口：① 运营端「临时开放课时授权」页缺少入口，运营无法触达；② 课后被移出活动临时开放列表后，已授权用户仍可播放（判定未回查活动列表），存在越权放行口。

**Architecture:** B 为前端改动（web 运营端），在活动列表项加按钮带 `activityId` 跳转 `temp-auth.vue` 并自动预选；C 为后端改动（zhao-point service），`isLessonTempAuthorized` 判定时回查授权记录关联活动的临时开放状态与列表，不在列表/关闭/删除即不放行。

**Tech Stack:** uni-app web 运营端 h.joho.cn；Strapi zhao-point 插件（`isLessonTempAuthorized`）。

---

## 设计决策锁定

- 本次仅做 `B`（入口）与 `C`（越权判定）；`A`（好友注册送积分 `invite_register`）本次不做，另行评估。
- **C 采用"判定时实时回查活动"方式**，而非"运营移除课时时批量置 isExpired"。理由：移除/关闭/删除各场景统一收敛到同一判定函数，无需维护额外事件同步，且活动读取频率可接受（用户每次进课时校验一次，量级小）。可接受的代价：判定依赖活动文档存活。
- 判定时**以授权记录自身的 `expiresAt` 为准**（既定约定），仅增加"活动是否仍开放该课时"这一维度；不改动 `expiresAt` 语义。

---

## B. 运营端手动授权入口（web 运营端）

**Files:**
- Modify: `e:\code\web\src\pages\activity\list.vue`
- Modify: `e:\code\web\src\pages\activity\temp-auth.vue`

**改动点：**

1. `list.vue` 活动操作区新增按钮「临时授权」，点击 `uni.navigateTo({ url: '/pages/activity/temp-auth?activityId=' + item.documentId })`。
2. `temp-auth.vue` 的 `onLoad(options)` 读取 `options.activityId`：若有，自动设为当前活动并加载其课时列表（复用现有 `handleActivityChange` / 活动加载逻辑，后台若已有则直接回填）。无 `activityId` 时保持现有首页样式（进入后需下拉选活动）。

**交互预期：** 运营从活动列表一键进入并自动锁定目标活动，直接选课时/目标客户/到期提交，减少一步操作。

---

## C. 堵临时课时越权口（zhao-point）

**Files:**
- Modify: `plugins/zhao-point/server/src/services/activity.ts`（`isLessonTempAuthorized`）

**改动点：** 在 `isLessonTempAuthorized` 已查到有效授权 `auth`（未过期、`authType=temp_lesson`、lesson 匹配）后，追加活动归属校验：

```
若 auth.activityDocumentId 非空：
  act = document(activity).findOne({ documentId: auth.activityDocumentId })
  放行条件 = act 存在
             && act.tempLessonMode !== 'none'
             && act.preUnlockLessons 包含 auth.lessonDocumentId
  任一项不满足 → 返回 { authorized:false, reason:'removed_from_activity' }
否则（无 activityDocumentId，历史授权）：维持现状放行（不误伤老数据）
```

**边缘：**
- 活动被删除（`findOne` 返回 null）→ `released = false`，不放行。
- 活动 `tempLessonMode` 改为 `none` → 不放行。
- 课时被移出 `preUnlockLessons` → 不放行。
- 无 `activityDocumentId` 的存量授权 → 保持兼容放行，不做破坏性变更。

---

## 明确不做（YAGNI/范围外）

- `A`：好友注册送 `invite_register` 积分（另行评估）。
- 不移除整门课程的 `grantCourseTrial` 向后兼容逻辑。
- 不引入"运营移除课时→批量失效授权"的事件同步机制。
- 不改动 `expiresAt` 锚定活动 `endTime` 的既有语义。

---

## 自审

- **占位扫描**：无 TBD/TODO。
- **内部一致**：B、C 独立，互不依赖；C 新增判定收敛到单一函数，无新增副作用。
- **范围**：单仓两处小改动，可归入一个实现计划。
- **歧义**：「活动删除」明确为 `findOne` null；「存量无 activityDocumentId 授权」明确维持放行。