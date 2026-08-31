# 活动期间临时开放单课时播放权 — 设计

日期：2026-08-31
范围：zhao-point（后端）+ shao C端（前端解锁判定）
目标：活动期间，对"特定客户"临时开放**单个课时**的播放权；活动结束自动收回。仅前端放行顺序锁，后端媒体鉴权保持现状不增设课时级拦截。

## 背景与现状缺口

现有机制（[activity.ts](e:/code/basic/plugins/zhao-point/server/src/services/activity.ts)）：
- 活动已有 `preUnlockLessons`（报名解锁课时，manyToMany → course-lesson，schema L38）与 `preUnlockArticles`
- 报名成功后调用 `grantCourseTrial`（L279-285）：给用户授予**整门课程** trial 授权（AUTH_UID, authType=trial），且**永久、无到期**
- `getLearningContent`（L1032-1077）已返回"本人已解锁学习内容"
- 前端课时是否可播放由顺序锁 [sequence-lock.ts](e:/code/shao/utils/sequence-lock.ts) 判定（仅按前置课时完成态），媒体鉴权（stream-token）只校验登录，不做课时级拦截

缺口：
1. 授权粒度为课程而非单课时
2. 只有"报名即解锁"，缺"达标解锁"与"运营手动授权"两类
3. 永久授权，无"活动结束收回"的到期逻辑
4. 有效期与活动起止未绑定

## 最终规则

- **开放对象（特定客户，三类可叠加）**
  1. 报名成功者：报名即获得该课时临时播放权
  2. 考核/达标者：完成活动配置的现有达标条件后生效（复用问卷/签到/关注等既有达标字段）
  3. 运营手动指定名单：活动下运营可对指定客户直接发"单课时临时播放"授权
- **授权来源（两条）**
  - 活动自动：开始生效、结束收回（有效期锚定活动的 startTime/endTime）
  - 管理端手动：运营对任意客户发某课时临时播放授权，带独立到期时间
- **约束**：每个活动最多绑定 1 个临时开放课时（沿用 `preUnlockLessons`，管理端约束数量）
- **生效点**：仅前端顺序锁放行；后端媒体鉴权（zhao-oss stream-token）不改
- **到期收回**：已授权记录在到期时间之后视为失效，解锁判定不再放行

## 数据模型（复用现有授权模型扩展）

复用现有课程授权实体，不做独立新表；在活动与授权实体上补充"单课时临时开放"语义。

1. **活动内容类型（zhao-point activity）**
   - 复用 `preUnlockLessons` 承担"临时开放课时"（管理端约束仅 1 条）
   - 新增字段 `tempLessonMode`（enumeration: `none | signup | milestone | manual | mixed`，默认 `none`）
     - mixed = 报名/达标/手动 三者叠加
   - 新增字段 `tempLessonExpiryFollowActivity`（boolean，默认 true）：临时授权是否锚定活动起止
   - 达标条件复用现有 `rewardConfig`/`questionnaire`/签到逻辑，不新增独立条件字段

2. **课程授权实体（现有，authType 扩展）**
   - 现有 `authType: trial`（课程级，永久）保持不变
   - 新增授权语义：`authType: temp_lesson`，携带：
     - 关联 `activity`（授权来源锚定）
     - 关联 `lesson`（单课时）
     - `expiresAt`（到期时间；活动自动授权 = 活动 endTime，手动授权 = 运营设定时间）
   - 非永久：前端判定、管理端展示均依赖 `expiresAt` 未过

## 后端改动（zhao-point）

1. **授权/解锁判定服务**：新增或扩展方法，输入 (userId, lessonDocumentId)，返回该课时是否可播放：
   - 顺序锁前置判断之外，叠加"临时课时授权"判断
   - 判定通过条件（任一命中即放行）：
     - 该课时命中某活动的 `tempLessonMode ≠ none` 的 `preUnlockLessons`，且用户已获得该活动的临时授权（报名/达标/手动任一来源），且 `expiresAt > now`
   - 复用现有 `grantCourseTrial` 逻辑扩展：报名解锁改为写到 `authType=temp_lesson` 并带活动 endTime 作为 expiresAt

2. **触发点**
   - 报名成功（现有 L622）：对象为报名者时，写 `temp_lesson` 授权
   - 达标判定通过（复用问卷完成/签到等达标位置）：写 `temp_lesson` 授权
   - 新增管理端手动授权接口（admin API）：运营指定 activity + lesson + 客户列表 +到期时间

3. **向外暴露**：解锁判定所需数据提供给 C端（供前端顺序锁之外放行）。不新增媒体鉴权拦截。

## 前端改动（shao）

1. **解锁判定整合**：[sequence-lock.ts](e:/code/shao/utils/sequence-lock.ts) / 播放页增加"临时课时授权"判断：
   - 从后端获取当前用户对某课时的临时授权态
   - 若该课时被顺序锁锁定，但存在有效临时授权 → 放行
   - 若授权已过期 → 恢复锁定，并按锁定提示
2. **播放页**（[video-player.vue](e:/code/shao/pages/video-player/video-player.vue) `getLessonLockStatus`/`handleLessonClick`）：在锁定弹窗前并入临时授权判断
3. 数据来源：播放页加载时携带 activity 上下文查询临时授权态

## 管理端（web dashboard）

- 活动配置：选择 `tempLessonMode` + 绑定 1 个临时开放课时（沿用 preUnlockLessons 选择器，约束数量）
- 手动授权入口：活动下选客户 + 定时效，发"单课时临时播放"授权
- 列表展示已授权客户及有效期；支持撤销

## 错误处理与边界

- **幂等**：同一用户 + 同一活动 + 同一课时 重复授权不重复写，已存在直接复用
- **到期/活动结束**：`expiresAt` 过期即失效；活动 endTime 变更不影响已发授权（或重算，明确采用"以授权记录的 expiresAt 为准"）
- **课时被移出 preUnlock / 活动删除**：已授权记录保留，但判定时校验"课时是否仍属于该活动临时开放列表"，不属于则不放行
- **未登录**：无授权，不回退临时放行

## 明确不做（YAGNI）

- 不做课程级/课时级的后端媒体鉴权拦截（沿用现状：stream-token 只校验登录）
- 不做多种达标条件自定义，复用现有达标逻辑
- 不做多课时批量（每活动仅 1 个临时课时）
- 不做活动结束后的补授权或延期（授权到期即收回，如需续期走管理端手动授权）