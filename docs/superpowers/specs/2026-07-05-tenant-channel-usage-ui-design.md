# 租户渠道使用范围开关 UI 设计

> **日期**: 2026-07-05
> **主题**: 在租户详情页增加 channelUsage 开关，在站点配置页只读显示并联动禁用 allowCrossChannel

## 1. 背景

后端已实现 `site-config.channelUsage` 三档枚举（site_only / site_and_cross / site_cross_user，默认 site_cross_user），控制跨渠道功能总开关。前端需提供管理入口：

- **租户详情页**（[web/pages/tenant/detail.vue](file:///e:/code/web/pages/tenant/detail.vue)）：管理员可编辑
- **站点配置页**（[web/pages/settings/site-config.vue](file:///e:/code/web/pages/settings/site-config.vue)）：只读显示，并联动禁用 `allowCrossChannel` 子开关

## 2. 字段语义关系

| 字段 | 层级 | 类型 | 编辑位置 | 控制范围 |
|---|---|---|---|---|
| `channelUsage` | 租户级（schema 列） | enum 三档 | tenant/detail.vue | 总开关，决定跨渠道功能是否启用 |
| `allowCrossChannel` | 配置级（extraConfig） | boolean | settings/site-config.vue | 子开关，仅在 channelUsage≠site_only 时生效 |

**依赖关系**：
- `channelUsage=site_only` → `allowCrossChannel` 开关强制禁用（即使 extraConfig 中存 true 也被 service 层屏蔽）
- `channelUsage≠site_only` → `allowCrossChannel` 可编辑

## 3. 目标

1. 租户详情页增加二态开关（ON=site_cross_user，OFF=site_only）
2. 站点配置页只读显示 channelUsage 状态
3. 站点配置页的 allowCrossChannel 开关在 site_only 模式下自动禁用
4. 不暴露中间档 site_and_cross（YAGNI）

## 4. 不改动范围（YAGNI）

- 不改后端 API（已支持 channelUsage 三档）
- 不改 allowCrossChannel 的 extraConfig 存储方式
- 不暴露 site_and_cross 中间档
- 不改其他 extraConfig 字段
- 不改列表页展示

## 5. 页面 A: 租户详情页（可编辑）

**文件**：[web/pages/tenant/detail.vue](file:///e:/code/web/pages/tenant/detail.vue)

### 5.1 UI 位置

渠道配置区块（第 171-198 行），渠道列表上方插入开关。

```
渠道配置
─────────────────────────────
是否允许跨渠道    [开关]

[ON] 开启后，用户可见跨渠道课程/分类，且可使用个人渠道数据
[OFF] 关闭后，仅展示站点渠道数据，跨渠道内容全部屏蔽

渠道列表...
```

### 5.2 数据绑定

- `formData.channelUsage` 字段，类型 string
- 默认值 `'site_cross_user'`（与后端 schema default 一致）
- 开关 ON → `'site_cross_user'`
- 开关 OFF → `'site_only'`
- 计算属性 `allowCrossChannel` = `formData.channelUsage !== 'site_only'`

### 5.3 改动点（5 处）

1. **template 渠道配置区块**（第 171-175 行后）加开关 + 提示文案
2. **formData 初始化**（[第 577-616 行](file:///e:/code/web/pages/tenant/detail.vue#L577-L616)）加 `channelUsage: 'site_cross_user'`
3. **SCHEMA_FIELDS Set**（[第 452-460 行](file:///e:/code/web/pages/tenant/detail.vue#L452-L460)）追加 `'channelUsage'`
4. **loadTenantDetail 回填**（[第 691 行](file:///e:/code/web/pages/tenant/detail.vue#L691)）加 `channelUsage: data.channelUsage || 'site_cross_user'`
5. **saveTenant 提交**（[第 976-996 行](file:///e:/code/web/pages/tenant/detail.vue#L976-L996)）data 对象追加 `channelUsage: formData.channelUsage`

### 5.4 代码片段

template（渠道配置区块开头）：
```vue
<view class="form-section">
  <view class="section-header">
    <text class="section-title">渠道配置</text>
    <text class="section-hint">必选（只能选择你有权限的渠道）</text>
  </view>

  <view class="form-item">
    <text class="form-label">是否允许跨渠道</text>
    <switch :checked="formData.channelUsage !== 'site_only'" @change="toggleChannelUsage" color="#07c160" />
    <text class="form-hint" v-if="formData.channelUsage !== 'site_only'">
      开启后，用户可见跨渠道课程/分类，且可使用个人渠道数据
    </text>
    <text class="form-hint" v-else>
      关闭后，仅展示站点渠道数据，跨渠道内容全部屏蔽
    </text>
  </view>

  <view class="channel-list">
    ...
  </view>
</view>
```

script（toggleChannelUsage 方法）：
```js
function toggleChannelUsage(e) {
  formData.channelUsage = e.detail.value ? 'site_cross_user' : 'site_only'
}
```

## 6. 页面 B: 站点配置页（只读 + 联动禁用）

**文件**：[web/pages/settings/site-config.vue](file:///e:/code/web/pages/settings/site-config.vue)

### 6.1 UI 位置

渠道配置区块（第 194-212 行），在 `allowCrossChannel` 开关上方插入只读展示项。

```
渠道配置
─────────────────────────────
跨渠道总开关    [只读] 已开启 / 已关闭
               由租户管理员配置，此处不可修改

跨渠道访问      [开关]（site_only 时强制禁用）
渠道邀请        [开关]
默认渠道范围    [picker]
```

### 6.2 数据绑定

- `form.channelUsage` 默认 `'site_cross_user'`
- 计算属性 `isCrossChannelLocked` = `form.channelUsage === 'site_only'`
- `allowCrossChannel` 开关 disabled 条件：`!isFieldEditable('allowCrossChannel') || isCrossChannelLocked.value`

### 6.3 改动点（5 处）

1. **template**（[第 196 行](file:///e:/code/web/pages/settings/site-config.vue#L196) 后）插入 channelUsage 只读展示项
2. **form 初始化**（[第 474-505 行](file:///e:/code/web/pages/settings/site-config.vue#L474-L505)）加 `channelUsage: 'site_cross_user'`
3. **loadConfig 回填**（[第 580-595 行](file:///e:/code/web/pages/settings/site-config.vue#L580-L595)）加 `channelUsage: data.channelUsage || 'site_cross_user'`
4. **[第 199 行](file:///e:/code/web/pages/settings/site-config.vue#L199) allowCrossChannel switch** 的 `:disabled` 追加 `|| form.channelUsage === 'site_only'`
5. **计算属性 isCrossChannelLocked**（新增，script 顶部）

### 6.4 代码片段

template（渠道配置区块，channelUsage 只读项）：
```vue
<view class="form-item switch-item">
  <view>
    <text class="form-label">跨渠道总开关</text>
    <text class="form-hint">由租户管理员配置，此处不可修改</text>
  </view>
  <view class="readonly-badge" :class="form.channelUsage !== 'site_only' ? 'enabled' : 'disabled'">
    {{ form.channelUsage !== 'site_only' ? '已开启' : '已关闭' }}
  </view>
</view>
```

template（allowCrossChannel 开关 disabled 条件修改）：
```vue
<view class="form-item switch-item" v-if="isFieldVisible('allowCrossChannel')">
  <text class="form-label">跨渠道访问</text>
  <switch
    :checked="form.allowCrossChannel"
    @change="form.allowCrossChannel = $event.detail.value"
    :disabled="!isFieldEditable('allowCrossChannel') || form.channelUsage === 'site_only'"
    color="#07c160"
  />
</view>
```

style（readonly-badge 样式）：
```scss
.readonly-badge {
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  &.enabled { background: #f0f9eb; color: #67c23a; }
  &.disabled { background: #fef0f0; color: #f56c6c; }
}
```

### 6.5 保存逻辑

- `channelUsage` **不提交**（只读，由租户详情页管理）
- `allowCrossChannel` 仍提交原值（site_only 时前端禁用，用户无法改）

## 7. 影响范围

| 文件 | 改动数 |
|---|---|
| [web/pages/tenant/detail.vue](file:///e:/code/web/pages/tenant/detail.vue) | 5 处 |
| [web/pages/settings/site-config.vue](file:///e:/code/web/pages/settings/site-config.vue) | 5 处 |

合计 2 个文件，10 处改动。

## 8. 测试

### 8.1 租户详情页

- 编辑模式打开：channelUsage 开关状态与后端数据一致
- 切换开关：ON 显示开启提示，OFF 显示关闭提示
- 保存后重新打开：状态保持
- 新建租户：默认 ON（site_cross_user）

### 8.2 站点配置页

- 加载后：channelUsage 只读项显示"已开启"或"已关闭"
- channelUsage=site_only 时：allowCrossChannel 开关灰色禁用，无法点击
- channelUsage≠site_only 时：allowCrossChannel 开关正常可编辑
- 保存：channelUsage 不被提交，allowCrossChannel 正常提交

### 8.3 联动验证

- 租户详情页切到 site_only → 站点配置页刷新 → allowCrossChannel 禁用
- 租户详情页切回 site_cross_user → 站点配置页刷新 → allowCrossChannel 可编辑
