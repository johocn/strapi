# 前端后台管理与后端插件 API 差异分析及开发计划

> 日期：2026-06-06
> 状态：待实施
> 前端项目：E:\code\web（UniApp Vue3 + Vant H5 Admin）

## 1. 现状概览

| 维度 | 前端 | 后端 |
|------|------|------|
| 框架 | UniApp Vue3 + Composition API | Strapi v5 插件 |
| 页面数 | 46 个 | 9 个插件 |
| API 模块 | 14 个 | 9 个插件 |
| API 路径 | 已对齐 `/zhao-{plugin}/v1/admin/` | — |
| 覆盖率 | ~70%（核心模块已覆盖） | — |

## 2. 逐模块差异分析

### 2.1 zhao-auth（认证+权限+角色管理）

**后端 Admin 路由（8条）：**
| Method | Path | 前端状态 |
|--------|------|---------|
| GET | /v1/admin/users | ✅ `getUsers` |
| GET | /v1/admin/users/:id/roles | ✅ `getUserRoles` |
| POST | /v1/admin/roles/assign | ✅ `assignRole` |
| POST | /v1/admin/roles/revoke | ✅ `revokeRole` |
| POST | /v1/admin/roles/batch-assign | ✅ `batchAssignRoles` |
| GET | /v1/admin/roles/logs | ✅ `getActionLogs` |
| GET | /v1/admin/permissions/tree | ✅ `getPermissionTree` |
| GET | /v1/admin/permissions/role/:role | ✅ `getRolePermissions` |
| PUT | /v1/admin/permissions/role/:role | ✅ `updateRolePermissions` |
| POST | /v1/admin/permissions/init | ✅ `initPermissions` |

**前端 User/My 路由：**
| Method | Path | 前端状态 |
|--------|------|---------|
| POST | /v1/login | ✅ `login` |
| GET | /v1/my/roles | ✅ `getMyRoles` |
| GET | /v1/my/permission-keys | ✅ `getMyPermissionKeys` |
| GET | /v1/my/channel-scope | ✅ `getMyChannelScope` |

**结论：完全对齐，无差异。**

---

### 2.2 zhao-channel（渠道管理）

**后端 Admin 路由（25+条）：**
| Method | Path | 前端状态 |
|--------|------|---------|
| GET | /v1/admin/channels | ✅ `getAdminChannelList` |
| GET | /v1/admin/channels/:id | ✅ `getAdminChannelDetail` |
| POST | /v1/admin/channels | ✅ `createChannel` |
| PUT | /v1/admin/channels/:id | ✅ `updateChannel` |
| DELETE | /v1/admin/channels/:id | ✅ `deleteChannel` |
| GET | /v1/admin/channels/:id/children | ✅ `getChannelChildren` |
| GET | /v1/admin/channels/:id/hierarchy | ✅ `getChannelHierarchy` |
| GET | /v1/admin/channels/tier-tree/:parentTier | ✅ `getTierTree` |
| GET | /v1/admin/channel-members | ✅ `getChannelMembers` |
| GET | /v1/admin/channel-members/:id | ✅ `getChannelMemberDetail` |
| POST | /v1/admin/channel-members | ✅ `addChannelMember` |
| PUT | /v1/admin/channel-members/:id | ✅ `updateChannelMember` |
| DELETE | /v1/admin/channel-members/:id | ✅ `removeChannelMember` |
| POST | /v1/admin/channel-permissions/check | ✅ `checkChannelPermission` |
| GET | /v1/admin/channel-permissions/user/:userId | ✅ `getUserChannels` |
| POST | /v1/admin/channel-permissions/batch-grant | ✅ `batchGrantChannels` |
| GET | /v1/admin/user-invites | ✅ `getInviteList` |
| GET | /v1/admin/user-invites/:id | ✅ `getInviteDetail` |
| POST | /v1/admin/user-invites | ✅ `createInvite` |
| POST | /v1/admin/user-invites/use | ✅ `useInvite` |
| PUT | /v1/admin/user-invites/:id | ✅ `updateInvite` |
| DELETE | /v1/admin/user-invites/:id | ✅ `deleteInvite` |
| GET | /v1/admin/dashboard | ❌ 前端缺失 |

**前端 User/Public 路由：**
| Method | Path | 前端状态 |
|--------|------|---------|
| GET | /v1/my/channels | ✅ `getChannelList` |
| POST | /v1/my/channel/register | ✅ `registerChannel` |
| POST | /v1/my/channel/validate | ✅ `validateChannel` |
| GET | /v1/my/channels/accessible | ✅ `getMyAccessibleChannels` |
| GET | /v1/my/invite/chain | ✅ `getInviteChain` |
| GET | /v1/my/invite/downstream | ✅ `getInviteDownstream` |
| GET | /v1/my/invite/stats | ✅ `getInviteStats` |
| GET | /v1/channel/public/:id | ✅ `getPublicChannel` |
| POST | /v1/channel/validate/public | ✅ `validatePublicChannel` |
| POST | /v1/channel/register/public | ✅ `registerPublicChannel` |
| GET | /v1/channel/:id | ✅ `getChannelDetail` |
| GET | /v1/channel/:id/network | ✅ `getChannelNetwork` |
| GET | /v1/channel/:id/stats | ✅ `getChannelStats` |

**差异：**
- ❌ 前端缺少 `GET /v1/admin/dashboard`（渠道仪表盘）

---

### 2.3 zhao-sso（SSO 管理）

**后端 Admin 路由（12条）：**
| Method | Path | 前端状态 |
|--------|------|---------|
| GET | /v1/admin/dashboard | ❌ 前端缺失 |
| GET | /v1/admin/users | ❌ 前端缺失 |
| GET | /v1/admin/users/:id | ❌ 前端缺失 |
| PUT | /v1/admin/users/:id | ❌ 前端缺失 |
| GET | /v1/admin/apps | ❌ 前端缺失 |
| POST | /v1/admin/apps | ❌ 前端缺失 |
| PUT | /v1/admin/apps/:id | ❌ 前端缺失 |
| GET | /v1/admin/channels | ❌ 前端缺失 |
| POST | /v1/admin/channels | ❌ 前端缺失 |
| PUT | /v1/admin/channels/:id | ❌ 前端缺失 |
| GET | /v1/admin/login-logs | ❌ 前端缺失 |
| GET | /v1/admin/channel-report | ❌ 前端缺失 |

**结论：前端完全缺失 zhao-sso 管理模块，需新建 API 模块 + 页面。**

---

### 2.4 zhao-oss（OSS 管理）

**后端 Admin 路由（10条）：**
| Method | Path | 前端状态 |
|--------|------|---------|
| GET | /v1/admin/sync/dashboard | ❌ 前端缺失 |
| GET | /v1/admin/sync/records | ❌ 前端缺失 |
| POST | /v1/admin/sync/trigger | ❌ 前端缺失 |
| POST | /v1/admin/sync/batch | ❌ 前端缺失 |
| DELETE | /v1/admin/sync/remote/:recordId | ❌ 前端缺失 |
| GET | /v1/admin/sync/health | ❌ 前端缺失 |
| GET | /v1/admin/settings | ❌ 前端缺失 |
| PUT | /v1/admin/settings | ❌ 前端缺失 |
| POST | /v1/admin/settings/test-provider | ❌ 前端缺失 |
| POST | /v1/admin/repair/folders | ❌ 前端缺失 |

**前端现有 OSS 接口（非 admin 路由）：**
| Method | Path | 说明 |
|--------|------|------|
| POST | /zhao-oss/upload | 文件上传（uni.uploadFile） |
| GET | /zhao-oss/media/list | 媒体列表 |
| GET | /zhao-oss/media/folders | 文件夹列表 |
| POST | /zhao-oss/media/folders | 创建文件夹 |
| DELETE | /zhao-oss/media/:id | 删除媒体 |
| GET | /zhao-oss/sync/status/:id | 同步状态查询 |

**差异：**
- ❌ 前端缺少全部 10 条 admin 路由（同步管理 + 设置 + 修复）
- ⚠️ 前端现有 OSS 接口路径不规范（缺少 `/v1` 前缀），需与后端确认实际路由

---

### 2.5 zhao-third（第三方管理）

**后端 Admin 路由（8条）：**
| Method | Path | 前端状态 |
|--------|------|---------|
| GET | /v1/admin/third-party-configs | ❌ 前端缺失 |
| GET | /v1/admin/third-party-configs/:documentId | ❌ 前端缺失 |
| POST | /v1/admin/third-party-configs | ❌ 前端缺失 |
| PUT | /v1/admin/third-party-configs/:documentId | ❌ 前端缺失 |
| DELETE | /v1/admin/third-party-configs/:documentId | ❌ 前端缺失 |
| GET | /v1/admin/third-party-accounts | ❌ 前端缺失 |
| GET | /v1/admin/third-party-accounts/:documentId | ❌ 前端缺失 |
| DELETE | /v1/admin/third-party-accounts/:documentId | ❌ 前端缺失 |

**结论：前端完全缺失 zhao-third 管理模块，需新建 API 模块 + 页面。**

---

### 2.6 zhao-common（功能开关）

**后端 Admin 路由（5条）：**
| Method | Path | 前端状态 |
|--------|------|---------|
| GET | /v1/admin/feature-flags | ✅ `getFeatureFlagList` |
| GET | /v1/admin/feature-flags/:flagKey | ✅ `getFeatureFlag` |
| POST | /v1/admin/feature-flags | ✅ `createFeatureFlag` |
| PUT | /v1/admin/feature-flags/:flagKey | ✅ `updateFeatureFlag` |
| DELETE | /v1/admin/feature-flags/:flagKey | ❌ 前端缺失 |

**差异：**
- ❌ 前端缺少 `DELETE /v1/admin/feature-flags/:flagKey`

---

### 2.7 zhao-course（课程管理）

**后端 Admin 路由（30+条）：**
| Method | Path | 前端状态 |
|--------|------|---------|
| GET | /v1/admin/courses | ✅ `getCourseList` |
| GET | /v1/admin/courses/:documentId | ✅ `getCourseDetail` |
| POST | /v1/admin/courses | ✅ `createCourse` |
| PUT | /v1/admin/courses/:documentId | ✅ `updateCourse` |
| DELETE | /v1/admin/courses/:documentId | ✅ `deleteCourse` |
| POST | /v1/admin/courses/:documentId/publish | ✅ `publishCourse` |
| POST | /v1/admin/courses/:documentId/unpublish | ✅ `unpublishCourse` |
| GET | /v1/admin/course-categories | ✅ `getCourseCategoryList` |
| GET | /v1/admin/course-categories/:documentId | ✅ `getCourseCategoryDetail` |
| POST | /v1/admin/course-categories | ✅ `createCourseCategory` |
| PUT | /v1/admin/course-categories/:documentId | ✅ `updateCourseCategory` |
| DELETE | /v1/admin/course-categories/:documentId | ✅ `deleteCourseCategory` |
| GET | /v1/admin/course-tags | ✅ `getCourseTagList` |
| GET | /v1/admin/course-tags/:documentId | ✅ `getCourseTagDetail` |
| POST | /v1/admin/course-tags | ✅ `createCourseTag` |
| PUT | /v1/admin/course-tags/:documentId | ✅ `updateCourseTag` |
| DELETE | /v1/admin/course-tags/:documentId | ✅ `deleteCourseTag` |
| GET | /v1/admin/knowledge-points | ✅ `getKnowledgePointList` |
| GET | /v1/admin/knowledge-points/:documentId | ✅ `getKnowledgePointDetail` |
| POST | /v1/admin/knowledge-points | ✅ `createKnowledgePoint` |
| PUT | /v1/admin/knowledge-points/:documentId | ✅ `updateKnowledgePoint` |
| DELETE | /v1/admin/knowledge-points/:documentId | ✅ `deleteKnowledgePoint` |
| GET | /v1/admin/course-lessons | ✅ `getLessonList` |
| GET | /v1/admin/course-lessons/:documentId | ✅ `getLessonDetail` |
| POST | /v1/admin/course-lessons | ✅ `createLesson` |
| PUT | /v1/admin/course-lessons/:documentId | ✅ `updateLesson` |
| DELETE | /v1/admin/course-lessons/:documentId | ✅ `deleteLesson` |
| GET | /v1/admin/user-courses | ✅ `getUserCourseList` |
| GET | /v1/admin/user-courses/:documentId | ✅ `getUserCourseDetail` |
| POST | /v1/admin/user-courses | ✅ `grantUserCourse` |
| DELETE | /v1/admin/user-courses/:documentId | ✅ `revokeUserCourse` |
| GET | /v1/admin/course-progresses | ✅ `getCourseProgressList` |
| GET | /v1/admin/course-progresses/:documentId | ✅ `getCourseProgressDetail` |
| PUT | /v1/admin/course-progresses/:documentId | ✅ `updateCourseProgress` |
| GET | /v1/admin/lesson-progresses | ✅ `getLessonProgressList` |
| GET | /v1/admin/lesson-progresses/:documentId | ✅ `getLessonProgressDetail` |
| PUT | /v1/admin/lesson-progresses/:documentId | ✅ `updateLessonProgress` |

**结论：完全对齐，无差异。**

---

### 2.8 zhao-point（积分管理）

**后端 Admin 路由（30+条）：**
| Method | Path | 前端状态 |
|--------|------|---------|
| POST | /v1/admin/point/earn | ✅ `earnPoints` |
| POST | /v1/admin/point/deduct | ✅ `deductPoints` |
| GET | /v1/admin/point-types | ✅ `getPointTypeList` |
| GET | /v1/admin/point-types/:documentId | ✅ `getPointTypeDetail` |
| POST | /v1/admin/point-types | ✅ `createPointType` |
| PUT | /v1/admin/point-types/:documentId | ✅ `updatePointType` |
| DELETE | /v1/admin/point-types/:documentId | ✅ `deletePointType` |
| GET | /v1/admin/point-rules | ✅ `getAdminRuleList` |
| GET | /v1/admin/point-rules/:documentId | ✅ `getAdminRuleDetail` |
| POST | /v1/admin/point-rules | ✅ `createRule` |
| PUT | /v1/admin/point-rules/:documentId | ✅ `updateRule` |
| DELETE | /v1/admin/point-rules/:documentId | ✅ `deleteRule` |
| POST | /v1/admin/point-rules/batch-enable | ✅ `batchEnableRules` |
| GET | /v1/admin/rule-templates | ✅ `getTemplateList` |
| POST | /v1/admin/rule-templates | ✅ `createTemplate` |
| PUT | /v1/admin/rule-templates/:documentId | ✅ `updateTemplate` |
| DELETE | /v1/admin/rule-templates/:documentId | ✅ `deleteTemplate` |
| POST | /v1/admin/rule-templates/:documentId/apply | ✅ `applyTemplate` |
| GET | /v1/admin/point-records | ✅ `getRecordList` |
| GET | /v1/admin/point-records/:documentId | ✅ `getRecordDetail` |
| POST | /v1/admin/point-records/admin-adjust | ✅ `adminAdjust` |
| POST | /v1/admin/point-records/batch-adjust | ✅ `batchAdjust` |
| GET | /v1/admin/point-records/statistics | ✅ `getRecordStats` |
| GET | /v1/admin/point-redemptions | ✅ `getRedemptionList` |
| GET | /v1/admin/point-redemptions/:documentId | ✅ `getRedemptionDetail` |
| PUT | /v1/admin/point-redemptions/:documentId | ✅ `updateRedemption` |
| GET | /v1/admin/products | ✅ `getProductList` |
| GET | /v1/admin/products/:documentId | ✅ `getProductDetail` |
| POST | /v1/admin/products | ✅ `createProduct` |
| PUT | /v1/admin/products/:documentId | ✅ `updateProduct` |
| DELETE | /v1/admin/products/:documentId | ✅ `deleteProduct` |
| POST | /v1/admin/products/:documentId/stock | ✅ `adjustProductStock` |
| GET | /v1/admin/config | ✅ `getPointConfig` |
| PUT | /v1/admin/config | ✅ `updatePointConfig` |
| GET | /v1/admin/verifications | ✅ `getVerificationList` |
| GET | /v1/admin/verifications/:documentId | ✅ `getVerificationDetail` |
| GET | /v1/admin/verifications/stats | ✅ `getVerificationStats` |
| GET | /v1/admin/dashboard | ✅ `getPointDashboard` |

**结论：完全对齐，无差异。**

---

### 2.9 zhao-quiz（考试管理）

**后端 Admin 路由（20+条）：**
| Method | Path | 前端状态 |
|--------|------|---------|
| GET | /v1/admin/quizzes | ✅ `getQuestionList` |
| GET | /v1/admin/quizzes/:documentId | ✅ `getQuestionDetail` |
| POST | /v1/admin/quizzes | ✅ `createQuestion` |
| PUT | /v1/admin/quizzes/:documentId | ✅ `updateQuestion` |
| DELETE | /v1/admin/quizzes/:documentId | ✅ `deleteQuestion` |
| GET | /v1/admin/quiz-exams | ✅ `getExamList` |
| GET | /v1/admin/quiz-exams/:documentId | ✅ `getExamDetail` |
| POST | /v1/admin/quiz-exams | ✅ `createExam` |
| PUT | /v1/admin/quiz-exams/:documentId | ✅ `updateExam` |
| DELETE | /v1/admin/quiz-exams/:documentId | ✅ `deleteExam` |
| GET | /v1/admin/quiz-exams/:documentId/questions | ✅ `getExamQuestions` |
| GET | /v1/admin/quiz-records | ✅ `getQuizRecordList` |
| GET | /v1/admin/quiz-records/:documentId | ✅ `getQuizRecordDetail` |
| PUT | /v1/admin/quiz-records/:documentId/grade | ✅ `gradeQuizRecord` |
| GET | /v1/admin/quiz-records/pending-grading | ✅ `getPendingGrading` |
| GET | /v1/admin/quiz-exam-attempts | ✅ `getExamAttemptList` |
| GET | /v1/admin/quiz-exam-attempts/:documentId | ✅ `getExamAttemptDetail` |
| GET | /v1/admin/quiz-batches | ✅ `getQuizBatchList` |
| GET | /v1/admin/quiz-batches/:documentId | ✅ `getQuizBatchDetail` |
| POST | /v1/admin/quiz-batches | ✅ `createQuizBatch` |
| PUT | /v1/admin/quiz-batches/:documentId | ✅ `updateQuizBatch` |
| DELETE | /v1/admin/quiz-batches/:documentId | ✅ `deleteQuizBatch` |
| POST | /v1/admin/quiz-batches/:documentId/import | ✅ `importQuizBatch` |
| GET | /v1/admin/quiz-batches/template/download | ✅ `downloadQuizTemplate` |

**结论：完全对齐，无差异。**

---

## 3. 差异汇总

### 3.1 前端缺失的后端 Admin API

| 优先级 | 插件 | 缺失 API | 缺失数 | 状态 |
|--------|------|---------|--------|------|
| ~~P1~~ | ~~zhao-sso~~ | ~~全部 12 条 admin 路由~~ | ~~12~~ | ✅ 已补建 `sso.js` |
| ~~P1~~ | ~~zhao-oss~~ | ~~全部 10 条 admin 路由~~ | ~~10~~ | ✅ 已补建 `oss-admin.js` |
| ~~P2~~ | ~~zhao-third~~ | ~~全部 8 条 admin 路由~~ | ~~8~~ | ✅ 已补建 `third-party.js` |
| ~~P3~~ | ~~zhao-channel~~ | ~~dashboard~~ | ~~1~~ | ✅ 已补建 `getChannelDashboard` |
| ~~P3~~ | ~~zhao-common~~ | ~~DELETE feature-flags/:flagKey~~ | ~~1~~ | ✅ 已补建 `deleteFeatureFlag` |

### 3.2 新增：zhao-tag 插件

本次新增 `zhao-tag` 通用标签插件，前端已创建 `tag.js` API 模块：

| 功能 | 前端 API | 后端路由 |
|------|---------|---------|
| 标签 CRUD | `getTagList/createTag/updateTag/deleteTag` | `/v1/admin/tags` |
| 标签分组 CRUD | `getTagGroupList/createTagGroup/updateTagGroup/deleteTagGroup` | `/v1/admin/tag-groups` |
| 分类预设 CRUD | `getCategoryPresetList/createCategoryPreset/updateCategoryPreset/deleteCategoryPreset` | `/v1/admin/category-presets` |
| 全局检索 | `searchByTag` | `/v1/search` |
| 分类推荐 | `suggestByCategory` | `/v1/suggest` |

### 3.3 前端有但后端可能不存在的 API

| 前端 API | 路径 | 说明 |
|---------|------|------|
| `uploadToOss` | POST /zhao-oss/upload | ✅ zhao-oss api.ts 已有 |
| `getOssMediaList` | GET /zhao-oss/media/list | ✅ zhao-oss api.ts 已有 mediaList |
| `getOssFolders` | GET /zhao-oss/media/folders | ✅ zhao-oss api.ts 已有 |
| `createOssFolder` | POST /zhao-oss/media/folders | ✅ zhao-oss api.ts 已有 |
| `deleteOssMedia` | DELETE /zhao-oss/media/:id | ✅ zhao-oss api.ts 已有 deleteMedia |
| `getOssSyncStatus` | GET /zhao-oss/sync/status/:id | ✅ zhao-oss api.ts 已有 getSyncStatus |
| `softDelete` | POST /zhao-common/v1/admin/soft-delete/:contentType/:documentId | ✅ 已集成到 zhao-common |
| `restoreSoftDelete` | POST /zhao-common/v1/admin/soft-delete/:contentType/:documentId/restore | ✅ 已集成到 zhao-common |
| `updateProfile` | PUT /api/users/me | ✅ 使用 Strapi users-permissions 原生路由 |

### 3.4 前端代码问题

| 问题 | 文件 | 状态 |
|------|------|------|
| redemption.js 与 points.js 兑换接口重复 | redemption.js + points.js | ✅ 已合并到 points.js |
| verification.js 与 points.js 核销接口重复 | verification.js + points.js | ✅ 已合并到 points.js |
| quiz.js 跨插件调用知识点 | quiz.js | 暂不需要改（知识点 CRUD 仍在 zhao-course） |

## 4. 开发计划

### Phase 1：补全缺失 API 模块 ✅ 已完成

- ✅ 新建 `src/api/sso.js`：12 条 admin API
- ✅ 新建 `src/api/oss-admin.js`：10 条 admin API
- ✅ 新建 `src/api/third-party.js`：8 条 admin API
- ✅ 新建 `src/api/tag.js`：标签+分组+预设+检索 API
- ✅ 补建 `channel.js` 的 `getChannelDashboard()`
- ✅ 补建 `featureFlag.js` 的 `deleteFeatureFlag(key)`
- ✅ 合并 `redemption.js`/`verification.js` 到 `points.js`

### Phase 2：zhao-tag 插件 ✅ 已完成

- ✅ 创建 `zhao-tag` 插件（tag/tag-group/tag-index/category-preset）
- ✅ 修改 `zhao-course` 的 course/course-lesson/knowledge-point 关联到 `zhao-tag.tag`
- ✅ 添加 lifecycle hooks 自动同步 tag-index
- ✅ 写入种子数据：5 个标签分组、每组预设标签、10 个课程预设、10 个知识点预设
- ✅ 注册插件到 `basic/config/plugins.ts`

### Phase 3：前端管理页面开发 ✅ 已完成

- ✅ SSO 管理页面（仪表盘、用户管理、应用管理、渠道同步、登录日志）
- ✅ OSS 管理页面（同步仪表盘、同步记录、存储设置）
- ✅ Third 管理页面（第三方配置管理、配置表单、绑定账号管理）
- ✅ Tag 管理页面（标签列表、标签表单、分组管理、分类预设、全局检索）

### Phase 4：前端代码清理 ✅ 已完成

- ✅ `softDelete.js` 路径更新为 `/zhao-common/v1/admin/soft-delete/...`
- ✅ `user.js` 路径更新为 Strapi 原生 `/api/users/me`
- ✅ `redemption.js` 和 `verification.js` 已删除（合并到 points.js）
- quiz.js 知识点接口暂不需要改（知识点本身仍在 zhao-course，只是标签关联改了）

### Phase 5：后端补缺 ✅ 已完成

- ✅ OSS 媒体管理路由已确认存在（zhao-oss api.ts 有 upload/mediaList/deleteMedia/folders）
- ✅ soft-delete 通用路由已集成到 zhao-common（服务+控制器+路由）
- ✅ user profile 更新路由使用 Strapi users-permissions 原生 `/api/users/me`
- ✅ zhao-tag admin 面板已创建（index.ts/pluginId.ts/Initializer/PluginIcon/HomePage/translations）

## 5. 优先级排序

| 优先级 | 任务 | 状态 |
|--------|------|------|
| P1 | SSO 管理模块（API + 页面） | ✅ 已完成 |
| P1 | OSS 管理模块（API + 页面） | ✅ 已完成 |
| P2 | Third 管理模块（API + 页面） | ✅ 已完成 |
| P2 | zhao-tag 插件 + 标签管理页面 | ✅ 已完成 |
| P3 | 零散接口补全（soft-delete、profile） | ✅ 已完成 |
| P3 | 前端代码清理（路径修正、合并去重） | ✅ 已完成 |
| P4 | Strapi build OOM 问题 | 待解决（需 8192MB+ 内存） |

## 6. 待解决

- **Strapi build OOM**：`npm run build` 时 admin panel 构建需要 8192MB+ 内存，可能需要优化构建配置或检查循环依赖
- **ESLint**：全项目 0 errors 0 warnings ✅
- **前端 API 路径对齐**：所有 API 模块已使用 `/zhao-*/v1` 前缀 ✅
