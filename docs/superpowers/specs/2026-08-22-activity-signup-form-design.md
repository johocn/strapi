# 活动报名表单信息收集 · 设计文档

日期：2026-08-22
状态：已确认（方案评审通过）
范围：C 端报名时按活动收集自定义表单信息（文本/手机号/多行文本/单选/下拉/多选/数字），运营端可配置字段；报名记录存档并可在名单、我的报名中查看；只读不可改。

## 1. 目标与边界
活动报名目前只接收 `{ activityId }`，无法收集报名者的姓名/手机号/选择项等业务信息。本次补齐"报名表单信息收集"：
- 每个活动可自定义报名表单字段（字段名/标签/类型/必填/选项/数值范围）
- C 端报名时按该活动配置渲染动态表单并前端校验，随报名一并提交
- 报名记录存 formData，运营端名单、C 端我的报名可查看；**只读不可改**

落点：**zhao-point**（后端）+ **web**（运营端）+ **shao**（C 端），无新增依赖、无新增 content-type（仅加字段）。

## 2. 数据模型
### 2.1 activity 新增 JSON 字段 `formConfig`（报名表单配置）
数组，元素结构：
| 字段 | 类型 | 说明 |
|---|---|---|
| `key` | string | 字段标识（唯一，提交的键） |
| `label` | string | 显示标签 |
| `type` | enum | `text` \| `phone` \| `textarea` \| `radio` \| `select` \| `multi` \| `number` |
| `required` | boolean | 是否必填（缺省 false） |
| `options` | string[] | `radio/select/multi` 的选项列表 |
| `min`/`max` | number | 仅 `number`：数值下限/上限（可选） |
| `placeholder` | string | 输入占位提示（可选） |

约束：`key` 在同一 formConfig 内唯一；`radio/select/multi` 必须提供至少 1 个 `options`。

### 2.2 activity-signup 新增 JSON 字段 `formData`
报名时提交的 `{ [key]: value }`，仅含 formConfig 定义的 key。空 formConfig 时为 `{}`/null。

## 3. 字段类型与校验（后端，必填 + 类型内置校验）
- 校验触发：`signup()` 时活动 `formConfig` 非空则校验 `formData`
- 校验规则：
  - 必填缺失/为空 → 失败
  - `phone`：内置中国大陆手机号格式校验
  - `number`：纯数字 + min/max 范围
  - `radio/select`：值必须 ∈ options（单选标量）
  - `multi`：值为数组，每个元素 ∈ options
  - `text/textarea`：不设额外正则，允许任意字符串
- 忽略 formConfig 未定义的 key（提交多余字段不报错但丢弃）
- 校验失败返回字段级错误（定位到 key），HTTP 400
- **向后兼容**：无 formConfig 的活动照常报名（formData 不校验、存空）；存量记录无 formData，名单展示时兜底为空，不报错

## 4. 接口契约
- 报名入口不变：`POST /v1/my/activity/signup`，请求体增加可选 `formData`
- `GET /adm/activities/:documentId/signups`（运营端名单）：每条报名记录返回 `formData`
- `GET /my/activities`（C 端我的报名）：每条返回 `formData`
- 管理端活动创建/更新：`formConfig` 随 activity 常规字段读写（create/update 透传即可）

## 5. 实现组件
- `services/activity.ts`：`signup()` 增加 `validateFormData(formConfig, formData)` 调用与存储；`rules/form.ts`（或 service 内私有方法）封装逐类型校验
- `services/activity.ts` 名单/我的报名查询：populate 后透传 `formData`
- controller 领取：signup 解析 body.formData；名单/我的报名已在既有返回体
- 前端（见 §6）

## 6. 前端
### 6.1 web（运营端）
- `src/pages/activity/form.vue`："报名设置"区块下新增"报名表单配置"字段编辑器（增/删字段，选类型、填标签/key/必填/选项/数值范围）→ 随 `createActivity/updateActivity` 提交 `formConfig`
- `src/pages/activity/signups.vue`：名单每行增加"报名信息"展开，按 formConfig 的 label 展示 formData
- `src/api/activity.js`：create/update 透传 formConfig；`getActivitySignups` 已在既有契约（返回含 formData）

### 6.2 shao（C 端）
- 活动详情报名：若 `activity.formConfig` 非空弹动态表单（按 type 渲染控件 + 前端校验）→ 收集后调 `signupActivity(id, formData)`
- `services/api.ts`：`signupActivity(activityId, formData?)` 扩展可选参数
- `pages/activity/my.vue`：我的报名可展开查看已提交 formData（按 label）
- 新增动态表单封装（`components` 或 detail.vue 内模态），改动集中在 detail.vue + my.vue

## 7. 验收
- `scripts/accept-activity-form.cjs`（端到端）
  - 配置 formConfig 的活动
  - 必填缺失、phone 格式错误、number 越界、multi 含非法选项 → 校验失败 400（字段级）
  - 合法 formData 报名成功；名单/我的报名返回完整 formData；未定义 key 被丢弃
  - 无 formConfig 的活动照常报名（兼容）
  - 清理零残留
- 前端：web build:h5 + shao build:h5 重建 dist，双端源码与 dist 提交

## 8. 主要风险
- shao 动态表单渲染较集中（detail.vue），用独立模态组件隔离，避免污染详情页主逻辑
- phone/number 校验规则需与前端一致，前端提交前先拦、后端兜底，双端规则同一套定义（表单字段描述即契约）