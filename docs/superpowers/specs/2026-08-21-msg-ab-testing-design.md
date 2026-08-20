# 消息中心 AB 测试 / 模板版本 · 设计文档

- 日期：2026-08-21
- 范围：zhao-sso（消息中心扩展）+ web 管理端
- 状态：设计确认，待实施

## 1. 目标与边界

在消息中心基础上提供**模板版本管理与 AB 测试**能力：同一模板可维护多个内容版本，发送时按权重随机分配版本并固化到消息任务，实现 A/B 对比；点击通过 link 追加 utm 参数经 visit-log 归因，管理端给出各版本发送/成功/点击/点击率对比。

**本期范围**
- 模板版本：独立版本表（内容/权重/状态 draft|active），模板编辑页内嵌版本管理
- AB 分配：buildJob 按权重加权随机选 active 版本并固化 job.version，重试不换版
- 统计：version 表累计 sentCount/successCount；点击实时按 visit-log(utmSource=msg, utmCampaign=version.code) 聚合
- 管理端 AB 对比：各版本发送数/成功率/点击率对比
- 兼容性：无 active 版本的存量模板回退模板本体发送，行为不变

**不在本期**：自动停止 AB（达到样本量自动收敛）、多场景维度交叉分析、统计回写定时任务（点击实时查即可）。

## 2. 数据模型（zhao-sso）

### SsoMsgTemplateVersion（collectionName `sso_msg_template_versions`）
| 字段 | 类型 | 说明 |
|---|---|---|
| template | relation→msg-template | 必填，所属模板 |
| code | string | 版本标识（如 v1/v2），模板内建议唯一 |
| name | string | 版本名（可选） |
| wxTemplateId | string | 覆盖模板的公众号模板ID |
| wxTemplateFields | json | 覆盖模板字段映射 |
| content | text | 版本正文（可选） |
| link | string | 版本跳转链接（可选） |
| weight | integer | AB 权重，默认 1；0=停用不参与分配 |
| status | enumeration [draft, active] | 默认 draft |
| sentCount / successCount / clickCount | integer | 累计（默认 0） |
| lastUsedAt | datetime | 最近一次被选 |

### SsoMsgJob 扩展
- 新增 `version` relation → sso_msg_template_versions（可空；旧任务为 null）

## 3. AB 分配与发送（sso-msg 改造）

### buildJob 版本选择
```
template = query(msg-template, { code, isEnabled })
versions = query(versions, { template: template.id, status: active })
if versions.length:
    v = weightedRandom(versions, weight)   // weight<=0 剔除
    job.version = v.id
    toTarget/link 等按 v 覆盖
else:
    job.version = null                      // 回退模板本体（向后兼容）
```
- link 构造：取 version.link（无版本取 template.link），追加 `utm_source=msg&utm_campaign=<version.code|template.code>&utm_content=<jobId>`
- 幂等 dedupeKey 逻辑不变（同一 dedupeKey 重试仍同一 job → 同一版本）

### sendJob 发送
- 取 job.version（populate 版本与 template）；有 version 用 version 的 wxTemplateId/wxTemplateFields/content，无则用 template 本体
- 发送成功：version.sentCount++、version.successCount++（异步计数，失败不加 success）；更新 lastUsedAt

## 4. 点击归因

- 用户点击模板消息 → 跳转 link（含 utm_source=msg&utm_campaign=version.code）→ H5 visit-log 现有 utmSource/utmCampaign 字段自动落库
- 统计接口按 `utmSource=msg, utmCampaign=<code>` count(visit-log) 实时聚合 → 返回各版本点击数与点击率（clickCount/sentCount）

## 5. 接口设计（admin，沿用 sso.msg.read/write）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/zhao-sso/v1/admin/msg-templates/:templateId/versions | 模板版本列表（含统计） |
| POST | /admin/msg-templates/:templateId/versions | 创建版本 |
| PUT | /admin/msg-templates/:templateId/versions/:id | 更新版本（权重/内容等） |
| DELETE | /admin/msg-templates/:templateId/versions/:id | 删除版本（有 job 引用则拒绝或软删） |
| POST | /admin/msg-templates/:templateId/versions/:id/activate | 设为 active（同模板其他 active 置 draft） |
| GET | /admin/msg-templates/:templateId/ab-stats | AB 对比（各版本 sent/success/click/点击率） |

> 版本 CRUD 用 db.query（camelCase）；`templateId` 为模板 documentId 或数字 id（控制器内统一解析为数字 id）。

## 6. 前端（web）

- 模板编辑页（msg-template/edit.vue）内嵌「版本管理」区：版本列表（code/name/权重/状态/计数）、新增版本（填 code/wxTemplateId/fields/content/link/weight）、编辑、启用（activate）、删除
- 新增「AB 对比」查看：模板列表项或版本区提供查看入口，弹出/跳转展示各版本发送数、成功率、点击数、点击率条形对比
- api/sso.js 增 ssoMsgTemplateVersionApi（list/create/update/delete/activate）与 abStats

## 7. 兼容性与风险

- 无版本模板：buildJob 回退模板本体，行为与现状完全一致（存量模板不受影响）
- 删除有 job 引用的版本：返回 400（存在关联任务），避免历史统计断裂
- 加权随机：weight 为 0 剔除；全 0 或无 active 版本回退模板本体
- 计数异步累加：发送后版本计数即时 +1（单实例无并发问题；多实例有计数竞争，可接受，统计以 job 表为准可选）
- visit-log 依赖 utm 落库：链接必须指向带 visit-log 采集的 H5（C 端 shao）

## 8. 验收口径

1. 无版本模板发送行为不变（回退模板本体，job.version=null）
2. 模板建 2 个 active 版本（weight 9:1），连续发送若干次 job.version 分布近似权重且同 dedupeKey 重试版本不变
3. 版本统计：发送成功 job 后 version.sentCount/successCount 增加
4. ab-stats 返回各版本 sent/success/click/点击率；构造 visit-log(utmSource=msg, utmCampaign=v1) 后点击数正确
5. 版本 activate 后同模板其他版本自动 draft；删除有 job 引用版本返回 400
