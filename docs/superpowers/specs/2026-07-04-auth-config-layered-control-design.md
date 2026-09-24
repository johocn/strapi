# 认证配置分层管控设计

## 背景与问题

当前系统存在两个页面编辑同一份 site-config 数据：

| 页面 | 角色 | 后端端点 |
|------|------|---------|
| `web/pages/tenant/detail.vue` | 平台管理员 | PUT `/admin/config/site/:id`（updateSiteById） |
| `web/pages/settings/site-config.vue` | 租户管理员 | PUT `/admin/config/site`（updateSite，无 id） |

引发的问题：

1. **字段重复且无约束**：两页都能改 authMode、三方登录开关，后写覆盖先写，职责不清。
2. **脏数据制造**：`tenant/detail.vue` 的 `saveTenant` 提交 `extraConfig: mergedExtraConfig`（嵌套对象），后端 updateSiteById 把它当普通 extraData 字段写入，导致 `extraConfig.extraConfig` 嵌套脏数据。这是近期"修改无效" bug 的根因之一（已通过读取端外层优先修复症状，但源头仍需处理）。
3. **字段不对齐**：`site-config.vue` 缺少 `wechatOpenPlatformEnabled` 开关，两页字段集不一致。
4. **tenant/detail.vue 无约束 UI**：未读取 `_meta.fieldConstraints`，平台管理员看不到模板约束信息（虽然平台管理员不需要被约束，但缺少约束可见性）。

## 设计目标

- **职责分层**：平台管理员决策"开通哪些能力"，租户管理员调整"能力参数"。
- **数据一致**：消除嵌套 extraConfig 脏数据源头，两页字段集对齐。
- **约束机制**：复用已实现的 `site-template.fieldConstraints`，租户页按约束渲染，平台页不受约束。
- **最小改动**：复用现有 isFieldVisible/isFieldEditable 机制，不引入新概念。

## 设计方案

### 1. 字段归属与约束策略

| 字段类别 | 平台页（tenant/detail） | 租户页（site-config） | 约束来源 |
|---------|------------------------|----------------------|---------|
| 认证模式（authMode） | 可编辑 | 受模板约束（默认可编辑） | template.fieldConstraints.authMode |
| 三方登录开关（5 个） | 可编辑 | 受模板约束（默认可编辑） | template.fieldConstraints.{开关名} |
| ssoLoginUrl | 可编辑 | 受模板约束（默认可编辑） | template.fieldConstraints.ssoLoginUrl |
| 站点信息（siteName/logo/SEO 等） | 可编辑 | 受模板约束 | template.fieldConstraints.{字段} |
| 功能开关（featureFlags） | 可编辑 | 受模板约束 | template.fieldConstraints.{字段} |
| 主题（themeConfig） | 可编辑 | 受模板约束 | template.fieldConstraints.themeConfig |

**关键规则**：
- 平台管理员在 tenant/detail.vue 不受任何约束（能看到能改所有字段）。
- 租户管理员在 site-config.vue 受当前租户关联模板的 fieldConstraints 约束。
- 模板未配置 fieldConstraints 时，所有字段默认 visible=true、editable=true（向后兼容）。

### 2. 前端修复：tenant/detail.vue 展开提交

**问题**：当前 `saveTenant` 构造的 data：
```js
const data = {
  siteName: ...,
  extraConfig: mergedExtraConfig,  // ❌ 嵌套对象
  ...
}
```

**修复**：展开 extraConfig 到顶层，不传 extraConfig 字段：
```js
const data = {
  siteName: ...,
  ...mergedExtraConfig,  // ✅ 展开到顶层
  ...
}
```

与 site-config.vue 的提交方式保持一致（site-config.vue 已是展开提交）。

### 3. 前端补齐：site-config.vue 增加 wechatOpenPlatformEnabled

在认证配置区域，douyinEnabled 开关之后增加：
```vue
<view class="form-item switch-item" v-if="isFieldVisible('wechatOpenPlatformEnabled')">
  <text class="form-label">微信开放平台</text>
  <switch :checked="form.wechatOpenPlatformEnabled"
          @change="form.wechatOpenPlatformEnabled = $event.detail.value"
          :disabled="!isFieldEditable('wechatOpenPlatformEnabled')" color="#07c160" />
</view>
```

同步修改：
- form 初始值加 `wechatOpenPlatformEnabled: false`
- loadConfig 读取 `data.wechatOpenPlatformEnabled ?? false`
- handleSave 提交 `wechatOpenPlatformEnabled: form.value.wechatOpenPlatformEnabled`

### 4. 后端兼容（防御性）：updateSiteById 识别顶层 extraConfig 字段

虽然前端修复后不再传嵌套 extraConfig，但为防御旧客户端或第三方调用，updateSiteById 在字段分类时识别顶层 `extraConfig` 字段并展开：

```ts
for (const [key, value] of Object.entries(body)) {
  if (BLOCKED_FIELDS.has(key)) continue;
  if (key === "extraConfig" && value && typeof value === "object" && !Array.isArray(value)) {
    // 防御性：把顶层 extraConfig 对象展开为 extraData 字段
    for (const [ek, ev] of Object.entries(value)) {
      extraData[ek] = ev;
    }
    continue;
  }
  // ...原有分类逻辑
}
```

updateSite（无 id 版）同样加此防御。

### 5. 脏数据清理：写入时自动消化

现有清理逻辑（updateSite/updateSiteById 写入前清理 mergedExtra.extraConfig 嵌套；getMergedConfig/getPublicConfig 读取时外层优先）保留。每次租户/平台保存都会清理该租户的脏数据。无需一次性迁移脚本。

## 数据流

```
平台管理员保存（tenant/detail.vue）
  ↓ 展开提交：{ siteName, authMode, wechatMiniProgramEnabled, ... }
  ↓ PUT /admin/config/site/:id
  ↓ updateSiteById 字段分类（含 extraConfig 顶层展开防御）
  ↓ mergedExtra 清理嵌套 extraConfig
  ↓ 写入 site-config 表（extraConfig 列为扁平 JSON）

租户管理员加载（site-config.vue）
  ↓ GET /admin/config/site
  ↓ getSite → getMergedConfig → 返回 _meta.fieldConstraints
  ↓ isFieldVisible/isFieldEditable 按约束渲染
  ↓ 被锁定字段显示但不可编辑，或隐藏

租户管理员保存（site-config.vue）
  ↓ 展开提交：{ siteName, authMode（若可编辑）, ... }
  ↓ PUT /admin/config/site
  ↓ updateSite 字段分类（含 extraConfig 顶层展开防御）
  ↓ validateUpdate 校验被锁定字段 → 拒绝写入
  ↓ mergedExtra 清理嵌套 extraConfig
  ↓ 写入 site-config 表
```

## 涉及文件

| 文件 | 改动 |
|------|------|
| `web/pages/tenant/detail.vue` | saveTenant 展开 extraConfig 提交；loadTenantDetail 清理 ec 嵌套逻辑保留 |
| `web/pages/settings/site-config.vue` | 增加 wechatOpenPlatformEnabled 开关；form/loadConfig/handleSave 同步 |
| `basic/plugins/zhao-common/server/src/controllers/config.ts` | updateSite 和 updateSiteById 增加 extraConfig 顶层字段展开防御 |

## 不改动项

- 后端 getMergedConfig/getPublicConfig 读取端清理逻辑（已修复，保留）。
- updateSite/updateSiteById 写入端 mergedExtra 清理逻辑（已修复，保留）。
- site-template schema 的 fieldConstraints 字段（已支持）。
- site-config.vue 的 isFieldVisible/isFieldEditable（已实现）。

## 测试要点

1. **平台页保存**：tenant/detail.vue 修改 authMode + 5 开关，保存后 GET 刷新值正确，无嵌套 extraConfig。
2. **租户页保存**：site-config.vue 修改 wechatOpenPlatformEnabled + 其他开关，保存后值正确。
3. **约束生效**：模板配置 `authMode: {editable: false}`，租户页 authMode 显示锁定，PUT 提交被 validateUpdate 拒绝。
4. **脏数据消化**：手动构造 `extraConfig: {extraConfig: {authMode: "local"}}` 脏数据，平台页保存后脏数据被清理。
5. **字段对齐**：两页都能配 5 个三方登录开关 + ssoLoginUrl。

## 风险

- **现有脏数据未清理的租户**：在平台管理员下次保存前，租户页读取仍可能显示旧值（因读取端已外层优先，实际不会出错，仅写入端会清理）。可接受。
- **模板未配置 fieldConstraints**：所有字段默认可编辑，与当前行为一致。无回退风险。
