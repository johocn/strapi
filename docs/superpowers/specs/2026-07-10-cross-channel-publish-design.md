# 多租户粗粒度设置与跨渠道发布控制 设计

> 日期：2026-07-10
> 范围：zhao-course 访问策略修复、site-config featureFlags 补全、dashboard ref bug 修复、新增 allowCrossChannelPublish 发布侧开关、课程表单联动

## 一、背景与问题

### 1.1 现状

项目已有跨渠道机制，但存在以下问题：

1. **访问策略详情层失效**：[checkCourseAccess](file:///e:/code/basic/plugins/zhao-course/server/src/controllers/course.ts#L73-L96) 第 82 行对 `specific + allowCrossChannel===true` 直接放行，未读取 `ctx.state.crossChannelEnabled`，导致 `site_only` 模式下这类课程仍可通过详情接口访问。列表层 [course service](file:///e:/code/basic/plugins/zhao-course/server/src/services/course.ts#L329) 已正确读取 `crossChannelEnabled`，两层不一致。

2. **featureFlags 缺失**：site-config schema default 只有 8 个粗粒度开关，缺 `logistics` 与 `studio`，导致后端新建记录时数据不完整。

3. **dashboard ref bug**：[dashboard/index.vue](file:///e:/code/web/pages/dashboard/index.vue#L618-L620) 漏声明 `studioEnabled` 和 `ssoEnabled` 两个 ref，模板 `v-if` 恒为 undefined（falsy），媒体发布中心与 SSO 区块永不显示。`onShow` 中对未声明变量赋值抛 ReferenceError，被空 catch 静默吞掉。

4. **缺少发布侧跨渠道开关**：现有 `allowCrossChannel`（访问侧）控制客户能否跨渠道**访问**课程，但无开关控制管理员能否把课程**发布**为跨渠道（标记为"全部渠道"）。

### 1.2 概念区分

| 开关 | 方向 | 含义 |
|---|---|---|
| `allowCrossChannelPublish`（新） | 发布侧 | 当前租户发布课程时，能否标记为"全部渠道"（让其他租户可见）。关闭后只能发布"指定渠道"课程 |
| `allowCrossChannel`（现有） | 访问侧 | 当前租户的 C 端客户，能否浏览其他租户发布的跨渠道课程 |

两者独立：租户 A 可关闭发布开关（不发跨渠道内容）但保留访问开关（仍能看别人的），反之亦然。

### 1.3 访问侧开关来源

访问侧 `crossChannelEnabled` 实际来自 `site-config.channelUsage`（`site_only` / `site_and_cross` / `site_cross_user`），由 [resolve-channel-scope.ts](file:///e:/code/basic/plugins/zhao-common/server/src/policies/resolve-channel-scope.ts#L73) 注入 `ctx.state.crossChannelEnabled = channelUsage !== 'site_only'`。

## 二、设计决策

### 2.1 方案选择：方案 A（最小改动）

在现有结构内最小改动，不重构访问策略到 zhao-auth，不新增 feature-flag CT。

### 2.2 关键决策汇总

| 决策点 | 选择 | 理由 |
|---|---|---|
| 两个开关是否合并 | 不合并 | 发布侧与访问侧语义不同 |
| `allowCrossChannelPublish` 层级 | 仅租户级 | 简单，不需要渠道级覆盖 |
| 关闭时表单表现 | 隐藏"全部渠道"选项，强制 specific | 清晰，避免灰色禁用项 |
| 访问策略是否调整 | 仅修复详情层 bug，不改语义 | 列表层已正确，详情层补齐 |
| dashboard ref bug | 纳入本次 | 与"多平台发布不显示"直接相关 |

## 三、访问策略修复（后端）

### 3.1 文件

[plugins/zhao-course/server/src/controllers/course.ts](file:///e:/code/basic/plugins/zhao-course/server/src/controllers/course.ts#L73-L96)

### 3.2 修复内容

第 82 行增加 `crossChannelEnabled !== false` 条件，与列表层逻辑对齐。

```ts
// 修复前
if (ch.channelScope === "specific" && ch.allowCrossChannel === true) {
  return true;
}

// 修复后
const crossChannelEnabled = ctx.state.crossChannelEnabled !== false;
if (crossChannelEnabled && ch.channelScope === "specific" && ch.allowCrossChannel === true) {
  return true;
}
```

### 3.3 修复后完整分支逻辑

| channelScope | allowCrossChannel | site_only 模式（crossChannelEnabled=false） | 非 site_only 模式 |
|---|---|---|---|
| all | 任意 | 放行（全渠道公开，符合语义） | 放行 |
| specific | true | 校验渠道交集（修复后不再放行） | 放行 |
| specific | false | 校验渠道交集 | 校验渠道交集 |

### 3.4 不改的部分

- 列表层 course service `find` 逻辑正确，不动
- zhao-auth 策略不动（访问校验在 zhao-course 控制器，不在 zhao-auth）
- `all` 课程始终可见/可访问，符合"全渠道公开"语义

## 四、featureFlags 补全与 dashboard ref bug 修复

### 4.1 site-config schema featureFlags 补全

**文件**：[plugins/zhao-common/server/src/content-types/site-config/schema.json](file:///e:/code/basic/plugins/zhao-common/server/src/content-types/site-config/schema.json#L77-L89)

default 补 `logistics: true` 与 `studio: true`：

```json
"featureFlags": {
  "type": "json",
  "default": {
    "sso": false,
    "points": true,
    "quiz": true,
    "course": true,
    "channel": true,
    "thirdParty": true,
    "oss": false,
    "website": true,
    "logistics": true,
    "studio": true
  }
}
```

### 4.2 后端 config service 兜底补全

**文件**：[plugins/zhao-common/server/src/services/config.ts](file:///e:/code/basic/plugins/zhao-common/server/src/services/config.ts)

`getPublicConfig` 在 featureFlags 为空时的兜底对象（第 274-281、408 行附近）同步补 `logistics: true` 与 `studio: true`，与 schema default 保持一致。

### 4.3 dashboard ref bug 修复

**文件**：[web/pages/dashboard/index.vue](file:///e:/code/web/pages/dashboard/index.vue#L618-L620)

第 618-620 行 ref 声明处补两行：

```js
// 修复前
const pointsEnabled = ref(true)
const websiteEnabled = ref(true)
const logisticsEnabled = ref(true)

// 修复后
const pointsEnabled = ref(true)
const websiteEnabled = ref(true)
const logisticsEnabled = ref(true)
const studioEnabled = ref(true)
const ssoEnabled = ref(true)
```

补声明后，`onShow` 中 `studioEnabled.value = config.featureFlags?.studio !== false` 与 `ssoEnabled.value = config.featureFlags?.sso !== false` 即可正常工作。

### 4.4 不改的部分

- `config-helper.js` 的 featureFlags 默认值已含 `studio: true` 与 `logistics: true`，无需改
- sso 默认值不一致（schema `false` vs config-helper `true`）是预存问题，不在本次范围

## 五、`allowCrossChannelPublish` 开关

### 5.1 存储位置

租户级，存于 `site-config.extraConfig`（json 字段），与现有 `allowCrossChannel`（访问侧）对称。键名 `allowCrossChannelPublish`，默认 `false`（未配置时视为关闭，只能发布指定渠道课程）。

### 5.2 后端读取

**文件**：[plugins/zhao-common/server/src/services/config.ts](file:///e:/code/basic/plugins/zhao-common/server/src/services/config.ts)

`getPublicConfig` 合并 extraConfig 时增加：

```ts
allowCrossChannelPublish: ec.allowCrossChannelPublish ?? false,
```

### 5.3 后端写入

**文件**：[plugins/zhao-common/server/src/controllers/config.ts](file:///e:/code/basic/plugins/zhao-common/server/src/controllers/config.ts)

确认 extraConfig 字段白名单能写入 `allowCrossChannelPublish`。若白名单是显式枚举则补该键，若是透传则无需改。

### 5.4 前端 config-helper.js 默认值

**文件**：[web/src/utils/config-helper.js](file:///e:/code/web/src/utils/config-helper.js#L61-L90)

`getDefaultConfig().featureFlags` 补：

```js
allowCrossChannelPublish: false,
```

`FEATURE_TO_MODULE` 映射补：

```js
allowCrossChannelPublish: 'channel',
```

### 5.5 设置页面 UI

**文件**：[web/pages/settings/site-config.vue](file:///e:/code/web/pages/settings/site-config.vue#L194-L221) 渠道配置区

在现有"跨渠道访问"（`allowCrossChannel`）开关下方增加"允许发布跨渠道课程"开关：

```html
<view class="form-item switch-item" v-if="isFieldVisible('allowCrossChannelPublish')">
  <view>
    <text class="form-label">允许发布跨渠道课程</text>
    <text class="form-hint">关闭后，课程发布时只能选择指定渠道，无法标记为全部渠道</text>
  </view>
  <switch :checked="form.allowCrossChannelPublish"
          @change="form.allowCrossChannelPublish = $event.detail.value"
          :disabled="!isFieldEditable('allowCrossChannelPublish') || form.channelUsage === 'site_only'"
          color="#07c160" />
</view>
```

约束：当 `channelUsage === 'site_only'` 时强制禁用（site_only 模式下跨渠道功能整体关闭，发布开关无意义）。

表单默认值（第 483-539 行 `form` 对象）补 `allowCrossChannelPublish: false`。

提交随 extraConfig 一起 PUT 到 `/zhao-common/v1/admin/site-config/:id`。

## 六、课程表单前端联动

### 6.1 course/form.vue 修改

**文件**：[web/pages/course/form.vue](file:///e:/code/web/pages/course/form.vue)

新增响应式变量：

```js
const allowCrossChannelPublish = ref(false)
```

加载站点配置时读取（在现有 `watch(() => userStore.currentTenantId, ...)` 中，与 `showCrossChannelSection` 并列）：

```js
allowCrossChannelPublish.value = isFeatureEnabled('allowCrossChannelPublish')
```

模板修改（渠道设置区块，第 220-258 行）：

1. "渠道范围"的"全部渠道（跨渠道公开）"选项加 `v-if` 条件：

```html
<label class="radio-item" v-if="allowCrossChannelPublish" @click="setChannelScope('all')">
  <text>全部渠道（跨渠道公开）</text>
</label>
<label class="radio-item" @click="setChannelScope('specific')">
  <text>指定渠道（渠道专属）</text>
</label>
```

2. 当 `allowCrossChannelPublish === false` 时，`form.channelScope` 强制设为 `'specific'`：

```js
if (!allowCrossChannelPublish.value) {
  form.channelScope = 'specific'
}
```

3. "允许跨渠道访问"开关的显示条件追加 `allowCrossChannelPublish`：

```html
<view class="form-item" v-if="showCrossChannelSection && allowCrossChannelPublish">
  <text class="form-label">允许跨渠道访问</text>
  ...
</view>
```

理由：当发布侧关闭时，课程被强制为 `specific`，`allowCrossChannel`（访问侧开关）在表单中无实际意义（课程不会是 `all`），隐藏避免混淆。

提交校验不变：现有 `specific` 模式校验（至少 1 个渠道 + pointChannel 必填）已覆盖强制 `specific` 场景。

### 6.2 category/form.vue 修改

**文件**：[web/pages/course/category/form.vue](file:///e:/code/web/pages/course/category/form.vue)

同 course/form.vue 逻辑：
- 新增 `allowCrossChannelPublish` ref
- 加载配置时读取
- "全部渠道"选项加 `v-if="allowCrossChannelPublish"`
- 关闭时强制 `specific`
- "允许跨渠道访问"开关追加 `allowCrossChannelPublish` 显示条件

### 6.3 不改的部分

- course/list.vue、course/detail.vue：无渠道逻辑，不动
- lesson/*：无渠道字段，不动
- 后端 course service `create`/`update`：已有 `site_only` 模式下 `allowCrossChannel=true` 的拦截，发布侧开关不拦截后端（前端表单已限制），后端保持现有逻辑

### 6.4 边界情况

| 场景 | 行为 |
|---|---|
| 新建课程，`allowCrossChannelPublish=false` | 表单只显示"指定渠道"，强制选渠道 |
| 编辑历史 `all` 课程，`allowCrossChannelPublish=false` | "全部渠道"选项隐藏，`channelScope` 被强制改为 `specific`，需选渠道才能保存 |
| `allowCrossChannelPublish=true` | 表单行为与现状完全一致 |

## 七、构建与验证

### 7.1 后端构建

涉及两个插件改动，分别构建 dist：

```bash
cd plugins/zhao-course
npx strapi-plugin build

cd plugins/zhao-common
npx strapi-plugin build
```

### 7.2 前端无构建

web 是 UniApp H5 项目，由 HBuilderX 发行构建，本次仅改 vue/js 源码，开发期热更新即可验证。

### 7.3 验证步骤

**A. 访问策略修复验证**

1. 租户 A 的 `channelUsage` 设为 `site_only`（跨渠道关闭）
2. 租户 A 下有一条 `specific + allowCrossChannel=true` 的课程
3. 用租户 A 的非渠道成员用户访问该课程详情 → 应返回 403（修复前返回 200）

**B. featureFlags 补全验证**

1. 新建 site-config 记录 → 查数据库 `feature_flags` 字段应含 `logistics: true` 与 `studio: true`
2. dashboard 页面应显示"物流中心"与"媒体发布中心"区块（需对应权限）

**C. dashboard ref bug 验证**

1. 登录后台 → dashboard 页面应显示"🎬 媒体发布中心"区块（需 `menu.studio-center` 权限）
2. dashboard 页面应显示"🔐 SSO 单点登录"区块（需 `menu.sso` 权限）

**D. allowCrossChannelPublish 开关验证**

1. 设置页面 → 渠道配置区应显示"允许发布跨渠道课程"开关
2. 开关关闭时 → 课程表单"渠道范围"只显示"指定渠道"，"全部渠道"选项隐藏
3. 开关关闭时 → 编辑历史 `all` 课程 → `channelScope` 被强制为 `specific`，需选渠道
4. 开关关闭时 → "允许跨渠道访问"开关隐藏
5. 开关开启时 → 表单行为与现状一致
6. `channelUsage === 'site_only'` 时 → "允许发布跨渠道课程"开关禁用

## 八、不做的事（YAGNI）

- 不重构访问策略到 zhao-auth
- 不加渠道级 `allowCrossChannelPublish` 覆盖
- 不改 `allowCrossChannel`（访问侧）任何逻辑
- 不改 sso 默认值不一致的预存问题
- 不改后端 course service create/update 的 `site_only` 拦截逻辑（前端已限制）
- 不新增 feature-flag CT
- 不改 course/list.vue、course/detail.vue、lesson/*

## 九、文件清单

| 文件 | 操作 | 责任 |
|---|---|---|
| `plugins/zhao-course/server/src/controllers/course.ts` | 修改 | `checkCourseAccess` 加 `crossChannelEnabled` 条件 |
| `plugins/zhao-common/server/src/content-types/site-config/schema.json` | 修改 | featureFlags default 补 logistics/studio |
| `plugins/zhao-common/server/src/services/config.ts` | 修改 | 兜底补 logistics/studio + 读取 allowCrossChannelPublish |
| `plugins/zhao-common/server/src/controllers/config.ts` | 修改（若白名单为显式枚举） | extraConfig 白名单补 allowCrossChannelPublish |
| `web/pages/dashboard/index.vue` | 修改 | 补 studioEnabled/ssoEnabled ref 声明 |
| `web/src/utils/config-helper.js` | 修改 | featureFlags 默认值补 allowCrossChannelPublish + FEATURE_TO_MODULE 映射 |
| `web/pages/settings/site-config.vue` | 修改 | 渠道配置区增加"允许发布跨渠道课程"开关 |
| `web/pages/course/form.vue` | 修改 | 联动 allowCrossChannelPublish：隐藏"全部渠道"选项 + 强制 specific |
| `web/pages/course/category/form.vue` | 修改 | 同 form.vue 联动逻辑 |
| `plugins/zhao-course/dist/` | 构建 | `npx strapi-plugin build` |
| `plugins/zhao-common/dist/` | 构建 | `npx strapi-plugin build` |
