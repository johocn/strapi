# 租户详情页渠道选择器树形改造设计

> 日期：2026-06-28
> 范围：`e:\code\web\pages\tenant\detail.vue`
> 关联：不涉及后端改动

## 1. 背景

租户详情页（`pages/tenant/detail`）的渠道选择器当前为扁平列表，存在两个问题：

1. **无层级可见性**：渠道数据本身有 `parentChannel` / `depth` / `path` 等树形字段，但选择器只显示 `channel.name`，用户看不出渠道间的父子关系。
2. **编辑模式只显示已选**：`loadChannels()` 在编辑模式下传 `site=documentId`，后端按 site 关联过滤后只返回已选渠道，其他可选渠道不可见，用户无法增减。

## 2. 目标

- 渠道选择器以**缩进树**形式展示全部可选渠道，默认全部展开
- 编辑模式下既显示已选渠道，也显示其他可选渠道，已选项标记 ✓
- 零后端改动

## 3. 设计

### 3.1 数据加载

**改造 `loadChannels()`**：前端两请求合并。

- 请求 1：`GET /admin/channels?pageSize=200`（不传 `site`）— 加载全部可选渠道（后端 `has-channel-scope` policy 已按用户权限过滤）
- 请求 2（仅编辑模式）：`GET /admin/channels?site=<documentId>` — 加载当前租户已关联渠道，提取 id 列表

**新增状态**：

- `selectedChannelIds: number[]` — 已选渠道 id 数组

**编辑模式数据流**：

```
全部可选渠道（请求1）  ┐
                       ├─→ 前端合并 ─→ channelTree ─→ flatTree ─→ 渲染（已选标记 ✓）
已选渠道 id（请求2）   ┘
```

**新建模式**：`selectedChannelIds` 初始化为空数组。

### 3.2 树形构建

新增计算属性 `channelTree`：基于 `parentChannel` 字段递归构建父子树。

- 输入：`availableChannels`（扁平数组）
- 输出：树形结构，每节点含 `children: []`
- 父子关系识别：兼容后端返回的 `parentChannelId.id` / `parentChannel.id` / `parentChannel`（纯 id）三种格式
- 排序：按 `depth` 升序，同级按 `name` 字母序

新增计算属性 `flatTree`：递归遍历 `channelTree`，输出扁平数组，每项带 `level` 字段（根节点 level=0，每深一层 +1）。

### 3.3 渲染

模板替换现有扁平列表（[detail.vue:183-202](file:///e:/code/web/pages/tenant/detail.vue#L183-L202)）为 `flatTree` 渲染：

- 缩进：`paddingLeft: (20 + level * 24) rpx`
- 层级标记：level > 0 时显示 `└─` 前缀
- 渠道项内容：`name` + `code`（可选）+ 已选 `✓`
- 默认全部展开（无折叠交互）

### 3.4 交互

- `isChannelSelected(id)`：基于 `selectedChannelIds.includes(id)`
- `toggleChannelSelection(channel)`：增删 `selectedChannelIds`
- 保存提交：`selectedChannelIds` 直接作为 `channels` 字段提交（后端 `syncChannelsForSite` 已兼容数字 id 数组）

## 4. 涉及文件

仅改动 `e:\code\web\pages\tenant\detail.vue`：

| 改动点 | 说明 |
|--------|------|
| `loadChannels()` | 两请求合并，不再传 `site` 过滤全部渠道 |
| 新增 `selectedChannelIds` | 已选渠道 id 状态 |
| 新增 `channelTree` | 构建父子树计算属性 |
| 新增 `flatTree` | 递归扁平化 + level 计算属性 |
| 模板 | 扁平列表 → `flatTree` 缩进渲染 |
| `isChannelSelected` / `toggleChannelSelection` | 数据源改为 `selectedChannelIds` |

## 5. 非目标

- 图片库插件图片地址问题（用户明确表示"先解决其他问题"）
- 后端 site-config 详情返回 channels 关联（规避 manyToMany populate 问题）
- 渠道选择器组件抽离（保持内联实现）
- 折叠交互（默认全展开即可）

## 6. 风险与约束

- **pageSize=200**：假设渠道总数不超过 200。若超出需改后端分页或调大参数。
- **parentChannel 字段格式**：需确认后端 `/admin/channels` 返回的 `parentChannelId` 是对象还是 id。设计已兼容三种格式，但需在实现时验证。
- **权限过滤**：依赖后端 `has-channel-scope` policy 正确过滤渠道范围（admin 全渠道，非 admin 按渠道范围）。
