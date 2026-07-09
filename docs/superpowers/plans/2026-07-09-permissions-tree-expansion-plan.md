# 权限树补全 + 角色体系扩展 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补全 permissions.ts 中 37 个遗漏 CT 的权限项，各归合适中心；新增 22 个角色（11 中心 × 管理员/编辑）；更新 3 个现有角色的权限映射。

**Architecture:** 单文件改动 `plugins/zhao-auth/server/src/permissions.ts`。先扩展 PERMISSION_TREE（新增 wealth-center + 扩展 studio/sso/零散），再加工具函数 centerPermissions/centerEditorPermissions，最后扩展 ROLES 枚举/ROLE_LABELS/DEFAULT_ROLE_PERMISSIONS。`initDefaultRoles` 启动时自动创建新角色并同步权限。

**Tech Stack:** TypeScript, Strapi v5 plugin, zhao-auth 权限系统

---

## 文件结构

**改动文件**：仅 `plugins/zhao-auth/server/src/permissions.ts`（单文件）

| 改动区域 | 行范围（当前） | 说明 |
|---|---|---|
| ROLES 枚举 | 1-7 | 追加 22 个角色常量 |
| ROLE_LABELS | 9-15 | 追加 22 个标签 |
| PERMISSION_TREE | 27-750 | 新增 menu.wealth-center + 扩展 studio/sso/point/quiz/channel/tag/oss |
| 工具函数 | 752-813 | 新增 centerPermissions/centerEditorPermissions（在 flattenPermissions 之后）|
| DEFAULT_ROLE_PERMISSIONS | 817-935+ | 更新 CHANNEL_ADMIN/PLUGIN_MANAGER/INSTRUCTOR + 追加 22 个角色 |

**测试策略**：jest/ts-node 未安装（npm install 会 OOM），测试文件创建但跳过运行，commit message 注明原因。

---

### Task 1: 扩展 ROLES 枚举 + ROLE_LABELS

**Files:**
- Modify: `plugins/zhao-auth/server/src/permissions.ts:1-15`

- [ ] **Step 1: 扩展 ROLES 枚举**

修改 `permissions.ts` 第 1-7 行，在 `USER: "user"` 后追加 22 个角色：

```typescript
export const ROLES = {
  ADMIN: "admin",
  CHANNEL_ADMIN: "channel-admin",
  PLUGIN_MANAGER: "plugin-manager",
  INSTRUCTOR: "instructor",
  USER: "user",
  // 11 个中心 × 2 = 22 个新角色
  WEBSITE_MANAGER: "website-manager",
  WEBSITE_EDITOR: "website-editor",
  LOGISTICS_MANAGER: "logistics-manager",
  LOGISTICS_EDITOR: "logistics-editor",
  COURSE_MANAGER: "course-manager",
  COURSE_EDITOR: "course-editor",
  STUDY_MANAGER: "study-manager",
  STUDY_EDITOR: "study-editor",
  QUIZ_MANAGER: "quiz-manager",
  QUIZ_EDITOR: "quiz-editor",
  POINT_MANAGER: "point-manager",
  POINT_EDITOR: "point-editor",
  MARKETING_MANAGER: "marketing-manager",
  MARKETING_EDITOR: "marketing-editor",
  SYSTEM_MANAGER: "system-manager",
  SYSTEM_EDITOR: "system-editor",
  TAG_MANAGER: "tag-manager",
  TAG_EDITOR: "tag-editor",
  STUDIO_MANAGER: "studio-manager",
  STUDIO_EDITOR: "studio-editor",
  WEALTH_MANAGER: "wealth-manager",
  WEALTH_EDITOR: "wealth-editor",
} as const;
```

- [ ] **Step 2: 扩展 ROLE_LABELS**

修改 `permissions.ts` 第 9-15 行，在 `[ROLES.USER]: "普通用户"` 后追加 22 个标签：

```typescript
export const ROLE_LABELS: Record<string, string> = {
  [ROLES.ADMIN]: "系统管理员",
  [ROLES.CHANNEL_ADMIN]: "渠道管理员",
  [ROLES.PLUGIN_MANAGER]: "插件管理员",
  [ROLES.INSTRUCTOR]: "讲师",
  [ROLES.USER]: "普通用户",
  [ROLES.WEBSITE_MANAGER]: "官网管理员",
  [ROLES.WEBSITE_EDITOR]: "官网编辑",
  [ROLES.LOGISTICS_MANAGER]: "物流管理员",
  [ROLES.LOGISTICS_EDITOR]: "物流编辑",
  [ROLES.COURSE_MANAGER]: "课程管理员",
  [ROLES.COURSE_EDITOR]: "课程编辑",
  [ROLES.STUDY_MANAGER]: "学习数据管理员",
  [ROLES.STUDY_EDITOR]: "学习数据编辑",
  [ROLES.QUIZ_MANAGER]: "题库管理员",
  [ROLES.QUIZ_EDITOR]: "题库编辑",
  [ROLES.POINT_MANAGER]: "积分管理员",
  [ROLES.POINT_EDITOR]: "积分编辑",
  [ROLES.MARKETING_MANAGER]: "营销管理员",
  [ROLES.MARKETING_EDITOR]: "营销编辑",
  [ROLES.SYSTEM_MANAGER]: "系统管理员(中心)",
  [ROLES.SYSTEM_EDITOR]: "系统编辑",
  [ROLES.TAG_MANAGER]: "标签管理员",
  [ROLES.TAG_EDITOR]: "标签编辑",
  [ROLES.STUDIO_MANAGER]: "工作室管理员",
  [ROLES.STUDIO_EDITOR]: "工作室编辑",
  [ROLES.WEALTH_MANAGER]: "理财管理员",
  [ROLES.WEALTH_EDITOR]: "理财编辑",
};
```

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-auth/server/src/permissions.ts
git commit -m "feat(zhao-auth): ROLES 枚举 + ROLE_LABELS 扩展 22 个中心角色"
```

---

### Task 2: 新增 menu.wealth-center（理财中心）

**Files:**
- Modify: `plugins/zhao-auth/server/src/permissions.ts` PERMISSION_TREE（在 logistics-center 后、闭合 `};` 前追加）

- [ ] **Step 1: 在 PERMISSION_TREE 中追加 wealth-center**

在 `permissions.ts` 的 PERMISSION_TREE 对象末尾（logistics-center 之后、闭合 `};` 之前）追加：

```typescript
  // ===== 理财中心 =====
  "menu.wealth-center": {
    label: "理财中心",
    type: "menu",
    children: {
      "menu.wealth-product": {
        label: "产品管理",
        type: "menu",
        children: {
          "wealth.wealth-product.read": { label: "查看", type: "button" },
          "wealth.wealth-product.create": { label: "创建", type: "button" },
          "wealth.wealth-product.update": { label: "编辑", type: "button" },
          "wealth.wealth-product.delete": { label: "删除", type: "button" },
          "wealth.wealth-product.collect": { label: "采集", type: "button" },
          "wealth.wealth-nav.read": { label: "查看净值", type: "button" },
          "wealth.wealth-nav.create": { label: "录入净值", type: "button" },
          "wealth.wealth-nav.update": { label: "编辑净值", type: "button" },
          "wealth.wealth-nav.delete": { label: "删除净值", type: "button" },
        },
      },
      "menu.wealth-company": {
        label: "公司管理",
        type: "menu",
        children: {
          "wealth.wealth-company.read": { label: "查看", type: "button" },
          "wealth.wealth-company.create": { label: "创建", type: "button" },
          "wealth.wealth-company.update": { label: "编辑", type: "button" },
          "wealth.wealth-company.delete": { label: "删除", type: "button" },
        },
      },
      "menu.wealth-collect": {
        label: "数据采集",
        type: "menu",
        children: {
          "wealth.wealth-collect-config.read": { label: "查看配置", type: "button" },
          "wealth.wealth-collect-config.create": { label: "创建配置", type: "button" },
          "wealth.wealth-collect-config.update": { label: "编辑配置", type: "button" },
          "wealth.wealth-collect-config.delete": { label: "删除配置", type: "button" },
          "wealth.wealth-collect-config.trigger": { label: "触发采集", type: "button" },
          "wealth.wealth-customer-product.read": { label: "查看持仓", type: "button" },
          "wealth.wealth-customer-product.create": { label: "录入持仓", type: "button" },
          "wealth.wealth-customer-product.delete": { label: "删除持仓", type: "button" },
        },
      },
      "menu.wealth-metrics": {
        label: "风险指标",
        type: "menu",
        children: {
          "wealth.wealth-risk-metric.read": { label: "查看风险", type: "button" },
          "wealth.wealth-risk-metric.update": { label: "编辑风险", type: "button" },
          "wealth.wealth-risk-metric.aggregate": { label: "聚合统计", type: "button" },
          "wealth.wealth-risk-metric.trend": { label: "趋势分析", type: "button" },
          "wealth.wealth-risk-metric.peers": { label: "同业对比", type: "button" },
          "wealth.wealth-risk-metric.recalculate": { label: "重算指标", type: "button" },
          "wealth.wealth-recommend-config.read": { label: "查看推荐配置", type: "button" },
          "wealth.wealth-recommend-config.create": { label: "创建推荐配置", type: "button" },
          "wealth.wealth-recommend-config.update": { label: "编辑推荐配置", type: "button" },
          "wealth.wealth-recommend-config.delete": { label: "删除推荐配置", type: "button" },
          "wealth.wealth-annual-snapshot.read": { label: "查看年报", type: "button" },
          "wealth.wealth-annual-snapshot.update": { label: "编辑年报", type: "button" },
          "wealth.wealth-yearly-return.read": { label: "查看年化收益", type: "button" },
          "wealth.wealth-yearly-return.update": { label: "编辑年化收益", type: "button" },
          "wealth.wealth-money-income.read": { label: "查看收益分配", type: "button" },
          "wealth.wealth-money-income.update": { label: "编辑收益分配", type: "button" },
        },
      },
    },
  },
```

- [ ] **Step 2: 提交**

```bash
git add plugins/zhao-auth/server/src/permissions.ts
git commit -m "feat(zhao-auth): PERMISSION_TREE 新增 menu.wealth-center 理财中心（10 CT）"
```

---

### Task 3: 扩展 menu.studio-center（直播工作室）

**Files:**
- Modify: `plugins/zhao-auth/server/src/permissions.ts` PERMISSION_TREE studio-center 部分

- [ ] **Step 1: 找到 studio-center 并扩展子菜单**

找到 PERMISSION_TREE 中 `menu.studio-center` 节点。现有结构只有 4 个粗粒度按钮权限（`zhao-studio.read/create/update/delete`）。保留现有权限（向后兼容），在其 `children` 中追加 4 个子菜单：

```typescript
      "menu.studio-collect": {
        label: "内容采集",
        type: "menu",
        children: {
          "studio.article-draft.read": { label: "查看文章草稿", type: "button" },
          "studio.article-draft.create": { label: "创建草稿", type: "button" },
          "studio.article-draft.update": { label: "编辑草稿", type: "button" },
          "studio.article-draft.delete": { label: "删除草稿", type: "button" },
          "studio.collect-source.read": { label: "查看采集源", type: "button" },
          "studio.collect-source.create": { label: "创建采集源", type: "button" },
          "studio.collect-source.update": { label: "编辑采集源", type: "button" },
          "studio.collect-source.delete": { label: "删除采集源", type: "button" },
          "studio.collect-task.read": { label: "查看采集任务", type: "button" },
          "studio.collect-task.create": { label: "创建采集任务", type: "button" },
          "studio.collect-task.update": { label: "编辑采集任务", type: "button" },
          "studio.collect-task.delete": { label: "删除采集任务", type: "button" },
          "studio.knowledge-point-index.read": { label: "查看知识索引", type: "button" },
          "studio.knowledge-point-index.create": { label: "创建知识索引", type: "button" },
          "studio.knowledge-point-index.update": { label: "编辑知识索引", type: "button" },
          "studio.knowledge-point-index.delete": { label: "删除知识索引", type: "button" },
        },
      },
      "menu.studio-publish": {
        label: "多平台发布",
        type: "menu",
        children: {
          "studio.publish-platform.read": { label: "查看发布平台", type: "button" },
          "studio.publish-platform.create": { label: "创建发布平台", type: "button" },
          "studio.publish-platform.update": { label: "编辑发布平台", type: "button" },
          "studio.publish-platform.delete": { label: "删除发布平台", type: "button" },
          "studio.publish-account.read": { label: "查看发布账号", type: "button" },
          "studio.publish-account.create": { label: "创建发布账号", type: "button" },
          "studio.publish-account.update": { label: "编辑发布账号", type: "button" },
          "studio.publish-account.delete": { label: "删除发布账号", type: "button" },
          "studio.publish-record.read": { label: "查看发布记录", type: "button" },
          "studio.publish-record.delete": { label: "删除发布记录", type: "button" },
        },
      },
      "menu.studio-stats": {
        label: "数据分析",
        type: "menu",
        children: {
          "studio.stat-summary.read": { label: "查看统计", type: "button" },
          "studio.stat-summary.export": { label: "导出统计", type: "button" },
          "studio.browser-log.read": { label: "查看浏览日志", type: "button" },
          "studio.browser-log.export": { label: "导出浏览日志", type: "button" },
        },
      },
      "menu.studio-ad": {
        label: "广告位",
        type: "menu",
        children: {
          "studio.ad-slot.read": { label: "查看广告位", type: "button" },
          "studio.ad-slot.create": { label: "创建广告位", type: "button" },
          "studio.ad-slot.update": { label: "编辑广告位", type: "button" },
          "studio.ad-slot.delete": { label: "删除广告位", type: "button" },
        },
      },
```

- [ ] **Step 2: 提交**

```bash
git add plugins/zhao-auth/server/src/permissions.ts
git commit -m "feat(zhao-auth): studio-center 扩展 4 子菜单（采集/发布/统计/广告，10 CT）"
```

---

### Task 4: 扩展 menu.system-center > menu.sso（SSO 扩展）

**Files:**
- Modify: `plugins/zhao-auth/server/src/permissions.ts` PERMISSION_TREE system-center > sso 部分

- [ ] **Step 1: 找到 menu.sso 并扩展子菜单**

找到 PERMISSION_TREE 中 `menu.system-center` > `menu.sso` 节点。现有 sso 子菜单只有 4 个核心 CT。保留现有，追加 5 个扩展子菜单：

```typescript
      "menu.sso-binding": {
        label: "三方绑定",
        type: "menu",
        children: {
          "sso.third-party-binding.read": { label: "查看三方绑定", type: "button" },
          "sso.third-party-binding.create": { label: "创建绑定", type: "button" },
          "sso.third-party-binding.update": { label: "编辑绑定", type: "button" },
          "sso.third-party-binding.delete": { label: "删除绑定", type: "button" },
          "sso.oauth-config.read": { label: "查看OAuth配置", type: "button" },
          "sso.oauth-config.create": { label: "创建OAuth配置", type: "button" },
          "sso.oauth-config.update": { label: "编辑OAuth配置", type: "button" },
          "sso.oauth-config.delete": { label: "删除OAuth配置", type: "button" },
        },
      },
      "menu.sso-token": {
        label: "令牌管理",
        type: "menu",
        children: {
          "sso.token.read": { label: "查看令牌", type: "button" },
          "sso.token.delete": { label: "删除令牌", type: "button" },
          "sso.auth-code.read": { label: "查看授权码", type: "button" },
          "sso.auth-code.delete": { label: "删除授权码", type: "button" },
        },
      },
      "menu.sso-user-role": {
        label: "用户应用角色",
        type: "menu",
        children: {
          "sso.user-app-role.read": { label: "查看角色", type: "button" },
          "sso.user-app-role.create": { label: "分配角色", type: "button" },
          "sso.user-app-role.update": { label: "编辑角色", type: "button" },
          "sso.user-app-role.delete": { label: "删除角色", type: "button" },
        },
      },
      "menu.sso-invite": {
        label: "邀请体系",
        type: "menu",
        children: {
          "sso.invite-code.read": { label: "查看邀请码", type: "button" },
          "sso.invite-code.create": { label: "创建邀请码", type: "button" },
          "sso.invite-code.delete": { label: "删除邀请码", type: "button" },
          "sso.invite-code.validate": { label: "核销邀请码", type: "button" },
          "sso.invite-usage.read": { label: "查看使用记录", type: "button" },
          "sso.invite-usage.delete": { label: "删除使用记录", type: "button" },
          "sso.invite-stats.read": { label: "查看邀请统计", type: "button" },
          "sso.referral-relation.read": { label: "查看推荐关系", type: "button" },
          "sso.referral-relation.delete": { label: "删除推荐关系", type: "button" },
        },
      },
      "menu.sso-sms": {
        label: "短信验证",
        type: "menu",
        children: {
          "sso.sms-code.read": { label: "查看短信码", type: "button" },
          "sso.sms-code.delete": { label: "删除短信码", type: "button" },
        },
      },
```

- [ ] **Step 2: 提交**

```bash
git add plugins/zhao-auth/server/src/permissions.ts
git commit -m "feat(zhao-auth): sso 扩展 5 子菜单（绑定/令牌/角色/邀请/短信，10 CT）"
```

---

### Task 5: 零散 CT 补全（point/quiz/channel/tag/oss）

**Files:**
- Modify: `plugins/zhao-auth/server/src/permissions.ts` PERMISSION_TREE 各中心

- [ ] **Step 1: point-center 扩展**

找到 `menu.point-center`，在现有 children 中追加 2 个子菜单：

```typescript
      "menu.point-rule-template": {
        label: "规则模板",
        type: "menu",
        children: {
          "point.rule-template.read": { label: "查看", type: "button" },
          "point.rule-template.create": { label: "创建", type: "button" },
          "point.rule-template.update": { label: "编辑", type: "button" },
          "point.rule-template.delete": { label: "删除", type: "button" },
        },
      },
      "menu.point-sign-in": {
        label: "签到记录",
        type: "menu",
        children: {
          "point.sign-in-record.read": { label: "查看", type: "button" },
          "point.sign-in-record.export": { label: "导出", type: "button" },
        },
      },
```

- [ ] **Step 2: quiz-center 扩展**

找到 `menu.quiz-center`，在现有 children 中追加 1 个子菜单 + 给现有 `menu.exam` 补 button：

```typescript
      // menu.exam 的 children 中追加（如果 menu.exam 已有 children）
      "quiz.exam-attempt.read": { label: "查看考试记录", type: "button" },
      "quiz.exam-attempt.delete": { label: "删除考试记录", type: "button" },
```

追加新子菜单：

```typescript
      "menu.quiz-batch": {
        label: "批量考试",
        type: "menu",
        children: {
          "quiz.quiz-batch.read": { label: "查看", type: "button" },
          "quiz.quiz-batch.create": { label: "创建", type: "button" },
          "quiz.quiz-batch.delete": { label: "删除", type: "button" },
        },
      },
```

**注意**：如果 `menu.exam` 当前不存在或没有 children，则在 quiz-center 下直接创建 `menu.exam`：

```typescript
      "menu.exam": {
        label: "考试管理",
        type: "menu",
        children: {
          "quiz.exam-attempt.read": { label: "查看考试记录", type: "button" },
          "quiz.exam-attempt.delete": { label: "删除考试记录", type: "button" },
        },
      },
```

- [ ] **Step 3: marketing-center 扩展 channel-permission**

找到 `menu.marketing-center` > `menu.channel-permission`，在现有 children 中追加 3 个 button：

```typescript
      "channel.user-channel.read": { label: "查看用户渠道", type: "button" },
      "channel.user-channel.assign": { label: "分配渠道", type: "button" },
      "channel.user-channel.revoke": { label: "撤销渠道", type: "button" },
```

**注意**：如果 `menu.channel-permission` 当前不存在，则在 marketing-center 下创建它。

- [ ] **Step 4: tag-center 扩展**

找到 `menu.tag-center`，在现有 children 中追加 1 个子菜单：

```typescript
      "menu.tag-index": {
        label: "标签索引",
        type: "menu",
        children: {
          "tag.tag-index.read": { label: "查看", type: "button" },
          "tag.tag-index.create": { label: "创建", type: "button" },
          "tag.tag-index.update": { label: "编辑", type: "button" },
          "tag.tag-index.delete": { label: "删除", type: "button" },
        },
      },
```

- [ ] **Step 5: system-center 扩展 media**

找到 `menu.system-center` > `menu.media`（现有占位），在现有 children 中追加 3 个 button：

```typescript
      "oss.media-meta.read": { label: "查看媒体", type: "button" },
      "oss.media-meta.upload": { label: "上传媒体", type: "button" },
      "oss.media-meta.delete": { label: "删除媒体", type: "button" },
```

**注意**：如果 `menu.media` 当前没有 children 或不存在，则创建它。

- [ ] **Step 6: 提交**

```bash
git add plugins/zhao-auth/server/src/permissions.ts
git commit -m "feat(zhao-auth): 零散 CT 补全（point 2 + quiz 2 + channel 1 + tag 1 + oss 1）"
```

---

### Task 6: 新增工具函数 centerPermissions / centerEditorPermissions

**Files:**
- Modify: `plugins/zhao-auth/server/src/permissions.ts` 工具函数区（flattenPermissions 之后、expandPermissionKeys 之前，约行 767 后）

- [ ] **Step 1: 在 flattenPermissions 之后追加工具函数**

在 `flattenPermissions` 函数闭合 `}` 之后、`expandPermissionKeys` 之前追加：

```typescript
/** 提取指定中心的全部权限 key（含中心 menu key 自身）*/
export function centerPermissions(centerKey: string): string[] {
  const center = PERMISSION_TREE[centerKey];
  if (!center?.children) return [];
  return [centerKey, ...flattenPermissions(center.children)];
}

/** 提取指定中心的编辑权限（排除 delete/manage）*/
export function centerEditorPermissions(centerKey: string): string[] {
  return centerPermissions(centerKey).filter(
    (k) => !k.endsWith(".delete") && !k.endsWith(".manage")
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add plugins/zhao-auth/server/src/permissions.ts
git commit -m "feat(zhao-auth): 新增 centerPermissions/centerEditorPermissions 工具函数"
```

---

### Task 7: 更新 CHANNEL_ADMIN 权限

**Files:**
- Modify: `plugins/zhao-auth/server/src/permissions.ts` DEFAULT_ROLE_PERMISSIONS CHANNEL_ADMIN 部分（约行 819-863）

- [ ] **Step 1: 在 CHANNEL_ADMIN 数组末尾追加 SSO 扩展 + media-meta 权限**

找到 `[ROLES.CHANNEL_ADMIN]` 数组，在末尾（现有 `// 物流中心权限由上方 flattenPermissions` 注释之后、闭合 `],` 之前）追加：

```typescript
    // SSO 扩展 + media-meta（system-center 被 flattenPermissions 排除，需显式追加）
    "menu.sso-binding", "sso.third-party-binding.read", "sso.third-party-binding.create", "sso.third-party-binding.update",
    "sso.oauth-config.read", "sso.oauth-config.create", "sso.oauth-config.update",
    "menu.sso-token", "sso.token.read", "sso.token.delete",
    "menu.sso-user-role", "sso.user-app-role.read", "sso.user-app-role.create", "sso.user-app-role.update",
    "menu.sso-invite", "sso.invite-code.read", "sso.invite-code.create", "sso.invite-code.validate",
    "sso.invite-usage.read", "sso.invite-stats.read", "sso.referral-relation.read",
    "menu.sso-sms", "sso.sms-code.read",
    "oss.media-meta.read", "oss.media-meta.upload", "oss.media-meta.delete",
```

- [ ] **Step 2: 提交**

```bash
git add plugins/zhao-auth/server/src/permissions.ts
git commit -m "feat(zhao-auth): CHANNEL_ADMIN 追加 SSO 扩展 + media-meta 权限"
```

---

### Task 8: 更新 PLUGIN_MANAGER 权限

**Files:**
- Modify: `plugins/zhao-auth/server/src/permissions.ts` DEFAULT_ROLE_PERMISSIONS PLUGIN_MANAGER 部分（约行 864-935）

- [ ] **Step 1: 在 PLUGIN_MANAGER 的 .concat 数组末尾追加**

找到 `[ROLES.PLUGIN_MANAGER]` 的 `.concat([...])` 数组，在末尾（现有 logistics-customer 权限之后、闭合 `])` 之前）追加：

```typescript
    // 理财中心（read/create/update，不含 delete）
    "menu.wealth-center",
    "menu.wealth-product", "wealth.wealth-product.read", "wealth.wealth-product.create", "wealth.wealth-product.update", "wealth.wealth-product.collect",
    "wealth.wealth-nav.read", "wealth.wealth-nav.create", "wealth.wealth-nav.update",
    "menu.wealth-company", "wealth.wealth-company.read", "wealth.wealth-company.create", "wealth.wealth-company.update",
    "menu.wealth-collect", "wealth.wealth-collect-config.read", "wealth.wealth-collect-config.create", "wealth.wealth-collect-config.update", "wealth.wealth-collect-config.trigger",
    "wealth.wealth-customer-product.read", "wealth.wealth-customer-product.create",
    "menu.wealth-metrics", "wealth.wealth-risk-metric.read", "wealth.wealth-risk-metric.aggregate", "wealth.wealth-risk-metric.trend", "wealth.wealth-risk-metric.peers",
    "wealth.wealth-recommend-config.read", "wealth.wealth-recommend-config.create", "wealth.wealth-recommend-config.update",
    "wealth.wealth-annual-snapshot.read", "wealth.wealth-yearly-return.read", "wealth.wealth-money-income.read",
    // SSO 扩展（read 为主）
    "menu.sso-binding", "sso.third-party-binding.read", "sso.oauth-config.read",
    "menu.sso-token", "sso.token.read",
    "menu.sso-user-role", "sso.user-app-role.read",
    "menu.sso-invite", "sso.invite-code.read", "sso.invite-stats.read",
    "menu.sso-sms", "sso.sms-code.read",
    // 零散补全
    "oss.media-meta.read",
```

- [ ] **Step 2: 提交**

```bash
git add plugins/zhao-auth/server/src/permissions.ts
git commit -m "feat(zhao-auth): PLUGIN_MANAGER 追加 wealth + SSO 扩展 + media-meta 权限"
```

---

### Task 9: 更新 INSTRUCTOR 权限

**Files:**
- Modify: `plugins/zhao-auth/server/src/permissions.ts` DEFAULT_ROLE_PERMISSIONS INSTRUCTOR 部分

- [ ] **Step 1: 在 INSTRUCTOR 数组末尾追加只读权限**

找到 `[ROLES.INSTRUCTOR]` 数组，在末尾（现有物流只读权限之后、闭合 `],` 之前）追加：

```typescript
    // 理财中心（只读）
    "menu.wealth-center",
    "menu.wealth-product", "wealth.wealth-product.read", "wealth.wealth-nav.read",
    "menu.wealth-company", "wealth.wealth-company.read",
    "menu.wealth-collect", "wealth.wealth-collect-config.read", "wealth.wealth-customer-product.read",
    "menu.wealth-metrics", "wealth.wealth-risk-metric.read", "wealth.wealth-recommend-config.read",
    "wealth.wealth-annual-snapshot.read", "wealth.wealth-yearly-return.read", "wealth.wealth-money-income.read",
    // 直播工作室（只读）
    "menu.studio-collect", "studio.article-draft.read", "studio.collect-source.read", "studio.collect-task.read",
    "menu.studio-publish", "studio.publish-platform.read", "studio.publish-account.read", "studio.publish-record.read",
    "menu.studio-stats", "studio.stat-summary.read",
    "menu.studio-ad", "studio.ad-slot.read",
    // 零散补全（只读）
    "point.rule-template.read", "point.sign-in-record.read",
    "quiz.quiz-batch.read", "tag.tag-index.read",
```

- [ ] **Step 2: 提交**

```bash
git add plugins/zhao-auth/server/src/permissions.ts
git commit -m "feat(zhao-auth): INSTRUCTOR 追加 wealth + studio + 零散只读权限"
```

---

### Task 10: 追加 22 个新角色到 DEFAULT_ROLE_PERMISSIONS

**Files:**
- Modify: `plugins/zhao-auth/server/src/permissions.ts` DEFAULT_ROLE_PERMISSIONS 末尾

- [ ] **Step 1: 在 DEFAULT_ROLE_PERMISSIONS 末尾（USER 之后）追加 22 个角色映射**

在 `[ROLES.USER]: [],` 之后、闭合 `};` 之前追加：

```typescript
  // ===== 11 个中心 × 2 = 22 个新角色 =====
  [ROLES.WEBSITE_MANAGER]: centerPermissions("menu.website-center"),
  [ROLES.WEBSITE_EDITOR]: centerEditorPermissions("menu.website-center"),
  [ROLES.LOGISTICS_MANAGER]: centerPermissions("menu.logistics-center"),
  [ROLES.LOGISTICS_EDITOR]: centerEditorPermissions("menu.logistics-center"),
  [ROLES.COURSE_MANAGER]: centerPermissions("menu.course-center"),
  [ROLES.COURSE_EDITOR]: centerEditorPermissions("menu.course-center"),
  [ROLES.STUDY_MANAGER]: centerPermissions("menu.study-center"),
  [ROLES.STUDY_EDITOR]: centerEditorPermissions("menu.study-center"),
  [ROLES.QUIZ_MANAGER]: centerPermissions("menu.quiz-center"),
  [ROLES.QUIZ_EDITOR]: centerEditorPermissions("menu.quiz-center"),
  [ROLES.POINT_MANAGER]: centerPermissions("menu.point-center"),
  [ROLES.POINT_EDITOR]: centerEditorPermissions("menu.point-center"),
  [ROLES.MARKETING_MANAGER]: centerPermissions("menu.marketing-center"),
  [ROLES.MARKETING_EDITOR]: centerEditorPermissions("menu.marketing-center"),
  [ROLES.SYSTEM_MANAGER]: centerPermissions("menu.system-center"),
  [ROLES.SYSTEM_EDITOR]: centerEditorPermissions("menu.system-center"),
  [ROLES.TAG_MANAGER]: centerPermissions("menu.tag-center"),
  [ROLES.TAG_EDITOR]: centerEditorPermissions("menu.tag-center"),
  [ROLES.STUDIO_MANAGER]: centerPermissions("menu.studio-center"),
  [ROLES.STUDIO_EDITOR]: centerEditorPermissions("menu.studio-center"),
  [ROLES.WEALTH_MANAGER]: centerPermissions("menu.wealth-center"),
  [ROLES.WEALTH_EDITOR]: centerEditorPermissions("menu.wealth-center"),
```

- [ ] **Step 2: 提交**

```bash
git add plugins/zhao-auth/server/src/permissions.ts
git commit -m "feat(zhao-auth): DEFAULT_ROLE_PERMISSIONS 追加 22 个中心角色映射"
```

---

### Task 11: 编译验证 + 最终提交

**Files:**
- Verify: `plugins/zhao-auth/server/src/permissions.ts`

- [ ] **Step 1: TypeScript 编译检查**

运行：
```bash
cd plugins/zhao-auth && npx tsc --noEmit server/src/permissions.ts 2>&1 | head -30
```

预期：无类型错误。如果有错误，修复后重新检查。

**注意**：如果 tsc 报缺少依赖错误（如 `@strapi/strapi` 类型），可改用项目级编译：
```bash
cd e:\code\basic && npx tsc --noEmit --skipLibCheck plugins/zhao-auth/server/src/permissions.ts 2>&1 | head -30
```

- [ ] **Step 2: 验证权限 key 唯一性**

在 Node 中验证：
```bash
cd plugins/zhao-auth && node -e "
const { PERMISSION_TREE, flattenPermissions, DEFAULT_ROLE_PERMISSIONS, ROLES } = require('./server/src/permissions.ts');
const allKeys = flattenPermissions(PERMISSION_TREE);
const unique = new Set(allKeys);
console.log('Total keys:', allKeys.length, 'Unique:', unique.size);
if (allKeys.length !== unique.size) {
  const dupes = allKeys.filter((k, i) => allKeys.indexOf(k) !== i);
  console.error('DUPLICATES:', dupes);
  process.exit(1);
}
console.log('22 new roles:', Object.keys(ROLES).length, 'total roles');
console.log('DEFAULT_ROLE_PERMISSIONS entries:', Object.keys(DEFAULT_ROLE_PERMISSIONS).length);
"
```

**注意**：如果 ts-node 未安装无法直接 require .ts 文件，可跳过此步，依赖 Strapi 启动时的运行时验证。

- [ ] **Step 3: 构建 zhao-auth 插件**

```bash
cd plugins/zhao-auth && npm run build
```

预期：编译成功，`dist/server/permissions.js` 更新。

- [ ] **Step 4: 提交构建产物**

```bash
git add plugins/zhao-auth/dist/
git commit -m "build(zhao-auth): 编译 dist 更新（权限树补全 + 22 新角色）"
```

---

## Self-Review

### 1. Spec coverage

| Spec 要求 | 对应 Task |
|---|---|
| wealth-center 10 CT | Task 2 |
| studio-center 10 CT 扩展 | Task 3 |
| sso 10 CT 扩展 | Task 4 |
| point 2 CT 补全 | Task 5 Step 1 |
| quiz 2 CT 补全 | Task 5 Step 2 |
| channel 1 CT 补全 | Task 5 Step 3 |
| tag 1 CT 补全 | Task 5 Step 4 |
| oss 1 CT 补全 | Task 5 Step 5 |
| 工具函数 centerPermissions/centerEditorPermissions | Task 6 |
| CHANNEL_ADMIN 权限更新 | Task 7 |
| PLUGIN_MANAGER 权限更新 | Task 8 |
| INSTRUCTOR 权限更新 | Task 9 |
| 22 个新角色 ROLES 枚举 | Task 1 |
| 22 个新角色 ROLE_LABELS | Task 1 |
| 22 个新角色 DEFAULT_ROLE_PERMISSIONS | Task 10 |
| 编译验证 | Task 11 |

✅ 全覆盖，无遗漏。

### 2. Placeholder scan

- Task 5 Step 2/3/5 有"如果 menu.exam 当前不存在"的条件分支 — 这是因为无法在不读取文件的情况下确定现有结构，给了两种情况的完整代码，不是 placeholder
- 无 TBD/TODO/实现后补

### 3. Type consistency

- `centerPermissions(centerKey: string): string[]` — Task 6 定义，Task 10 使用 ✓
- `centerEditorPermissions(centerKey: string): string[]` — Task 6 定义，Task 10 使用 ✓
- 权限 key 格式 `{domain}.{ct-singular}.{action}` — 全局一致 ✓
- ROLES 枚举 key 与 DEFAULT_ROLE_PERMISSIONS 引用一致 ✓

### 4. 已知限制

- 测试无法运行（jest/ts-node 未安装，npm install 会 OOM）
- Task 5 的条件分支需实现时根据现有 PERMISSION_TREE 结构判断
- zhao-auth 无 admin/ 目录，前端通过 Strapi Content Manager 动态读取角色，无需改前端
