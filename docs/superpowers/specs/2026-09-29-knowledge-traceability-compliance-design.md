# D 阶段：知识图谱可追溯与合规设计

- 日期：2026-09-29
- 范围：`plugins/zhao-website`（basic）+ 实体页 JSON-LD（strapi-site）
- 来源：GEO 体检 gap #8 —— 知识实体/关系无版本、无变更历史、无审核流水

## 一、目标与边界

**解决场景（两者兼顾）**
- 对外合规举证：证明「某条事实在 X 时点、由 Y 核准、来源为 Z」。
- 内部编辑回溯：查清谁在何时改了哪些字段、从什么值改到什么值。

**明确不做**
- 不做回滚/版本恢复（只做可查证）。
- 不新增「当前责任人 owner」字段；责任链由流水按时间倒序串联，「当前责任人」= 最近一次 approve 的 actor。
- 不对外暴露审核人个人身份、审核理由、历史明细。
- 不做职责分离强校验（即不强制「审核人 ≠ 提交人」）——现有存量数据无提交人，强校验会导致老数据无法通过审核。
- 不引入 Strapi EE 的 Content History（EE 功能，且只覆盖内容类型编辑，不适用自定义审核流）。

## 二、现状盘点

| 项 | 现状 |
|---|---|
| 三表 `knowledge-entity` / `knowledge-relation` / `first-truth-policy` | 均 `draftAndPublish: false`，有 `status`(bool) + `deletedAt`(软删) + `verificationStatus`(verified/pending/outdated/conflict) + `lastVerifiedAt` |
| `knowledge-entity.verifiedBy` | 已声明 → `admin::user`，**全仓库无任何写入点**，是死字段 |
| 操作人 | admin 路由的 service 调用只传 `ctx.state.siteId`，未传 `ctx.state.user` |
| 版本 | 无。可参考 pattern：`ai-content-summary` 用 `version` integer 递增，属就地版本号、不留历史 |
| 审核动作 | `first-truth.verify` 只把状态置 verified，无留痕、无驳回 |
| 公开出口 | `/v1/knowledge-graph.json`、`/v1/knowledge-graph/:slug`、`/v1/facts.json`，均 `auth: false`；`facts.json` 已露 `lastVerifiedAt`/`verificationStatus`/`sourceUrl`/`sourceType` |

前置事实（已核实）
- `ctx.state.user` 由 [is-authenticated.ts](../../../plugins/zhao-auth/server/src/policies/is-authenticated.ts) 注入，且已是所有 KG admin 路由的第一道 policy，取操作人无需新增鉴权机制。
- `exportFacts` 的导出白名单是 `["verified","pending","outdated"]` —— 新增 `rejected` 态天然不在白名单内。
- `findEntityBySlug` 只过滤 `status: true` + `sourceType ≠ derived`，**未过滤 `verificationStatus`**，被驳回实体目前仍会进实体页与图谱导出（本次一并补漏）。

## 三、数据模型

### 3.1 新增 append-only 流水表 `knowledge-audit-log`

```
collectionName: zhao_website_knowledge_audit_logs
displayName:   知识审计流水
pluginOptions: content-manager.visible = false（与 visit-log 一致，后台走自定义页面）
```

| 字段 | 类型 | 说明 |
|---|---|---|
| site | relation manyToOne → `plugin::zhao-common.site-config`，`required: false`，**单向无 inversedBy** | 租户隔离；全局记录 site=null。单向以避免改动 zhao-common 的 site-config schema |
| targetType | enumeration `entity` / `relation` / `first-truth`，required | 被操作对象类型 |
| targetId | string，required | 存 **documentId**（稳定，与 admin API 一致） |
| action | enumeration `create`/`update`/`delete`/`submit`/`approve`/`reject`/`recheck`，required | 前 6 个人工动作；`recheck` 专给系统自动比对与传导 |
| actorId | string | 操作人 admin user id；系统动作为空 |
| actorLabel | string | 操作人用户名快照，用户改名/删除后历史仍可举证 |
| changedFields | json | 字段级 diff：`{ 字段名: { before, after } }` |
| reason | text | 提交/驳回理由与依据说明（驳回必填） |
| version | integer | 该次变更后的版本号，与主表对齐 |
| deletedAt | datetime | 仅为满足全表约定；**不提供任何删除/修改路由**（只读追加） |

### 3.2 三张主表各加 `version`

`integer`，`default: 1`，写入成功即 +1。对外要露 `version`，因此必须落在主表，不能只存流水。

### 3.3 激活 `knowledge-entity.verifiedBy`

`approve` 时一并写入审核人，成本为零，消除死字段。`knowledge-relation` / `first-truth-policy` **不加**对应字段——责任链靠流水串联。

### 3.4 枚举变更

三表的 `verificationStatus` 枚举各加 `rejected`：
`verified` / `pending` / `outdated` / `conflict` / **`rejected`**

## 四、写入面

### 4.1 新 service

`server/src/services/knowledge-audit.ts`（单一职责）
- `append({ siteId, targetType, targetId, action, actor, changedFields, reason, version, strict })`
- `findByTarget(siteId, targetType, targetId, { page, pageSize })`

必要小重构：把 `knowledge-graph.ts` 内部私有的 `stableJson` 抽到 `server/src/services/utils/stable-json.ts`，并新增 `diffFields(before, after)`（只返回真正变化的字段）。避免 diff 逻辑写两份。

### 4.2 埋点位置（全部在 service 层）

| 位置 | action |
|---|---|
| `createEntity` / `addRelation` / `first-truth.create` | `create` |
| `updateEntity` / `updateRelation` / `first-truth.update` | `update` |
| `deleteEntity` / `deleteRelation` / `first-truth.softDelete` | `delete` |
| `compareRelationWithTruth`、`_markRelatedEntitiesPending` | `recheck`（仅当状态实际变化时写，否则全量重比会刷爆流水） |
| 新增 `submit` / `approve` / `reject` × 三表 | 对应同名 action |

### 4.3 操作人传递

controller 从 `ctx.state.user` 取 `{ id, label }`（label 取 username），作为 service 入参 `actor`。现有 11 条 KG 写路由 + 4 条真值写路由补传。

### 4.4 版本递增

主表 update 时带 `version: (existing.version || 1) + 1`；create 时默认 1。

### 4.5 审计失败策略

- 普通业务变更：`strict: false`，写流水失败只 `warn`，不阻塞业务。
- 审核动作（submit/approve/reject）：`strict: true`，写流水失败直接 500。
- 顺序：**先更新状态，再写流水**。Strapi 的 `db.query` 在本项目未封装事务，无法原子化；选择该顺序的理由是「状态是事实、记录是证据」，让人看到 500 去核查，比静默无记录安全。

## 五、读取面

### 5.1 admin 路由新增

- `GET /v1/admin/knowledge-audit-logs`（query: `targetType`/`targetId`/`action`/`page`/`pageSize`），权限 `knowledge-entity.read`。
- 9 条动作路由，权限分别挂三表的 `.update`：
  - `/knowledge-graph/entities/:documentId/{submit|approve|reject}`
  - `/knowledge-graph/relations/:documentId/{submit|approve|reject}`
  - `/first-truths/:documentId/{submit|approve|reject}`

**契约兼容**：已有 `POST /first-truths/:documentId/verify` 签名不变，内部转发到 `approve`，不突破既有契约。

### 5.2 后台 UI

`KnowledgeGraphPage` 的实体表/关系表各加「历史」按钮 → 复用现有 antd `Modal` pattern（该页无 Drawer，不引入新组件体系），展示流水列表 + 提交/通过/驳回按钮（驳回弹原因输入）。`FirstTruthPage` 同构。不做 diff 高亮美化、筛选面板、历史导出。

## 六、公开出口

- `facts.json` 每条加 `version`。
- `exportEntity` 返回体加 `version`；`_entityToJsonLd` 加 `version` + `dateModified`（取 `updatedAt`）。
- `knowledge-graph.json` 的 `@graph` 每项同样加 `version` + `dateModified`。
- 补漏：`findEntityBySlug` 补 `verificationStatus: { $ne: "rejected" }`。
- 公开出口不新增历史端点，不露 `actorId` / `actorLabel` / `reason`。

## 七、测试与交付

### 7.1 测试

- 新增 `tests/services/knowledge-audit.test.ts`：append 成功、失败不阻塞、`strict` 抛错、diff 只含变更字段、键序不同不产生 diff。
- 新增审核动作测试：`submit→pending`、`approve→verified 且 version+1`、`reject→rejected 且缺理由 400`。
- 更新 `tests/content-types.test.ts`：CT 数量 23 → 24。
- 更新 `tests/services/knowledge-graph.test.ts`：rejected 实体不进 `exportEntity`/`exportGraph`；facts 带 `version`。
- 更新 `tests/services/first-truth.test.ts`：`verify` 兼容别名仍置 verified。

### 7.2 跨仓改动

`strapi-site` 实体页 JSON-LD 由前端 fetch `exportEntity` 后自行组装（A1 阶段实现），新增的 `version`/`dateModified` **必须同步改 `KnowledgeEntityView.tsx` 才会真正输出**。本次涉及 2 个仓库，分开提交。

### 7.3 交付顺序

1. 插件 `npm run build`（`dist/server/index.js` + `index.mjs` 一起提交）
2. `npm test` 全绿
3. basic：`git add` 具体文件 → commit → push
4. `ssh joho` 拉取 + `pm2 startOrReload ecosystem.config.cjs --update-env`
5. 等 2–3 分钟 → `curl http://127.0.0.1:1337/_health` 期望 204
6. `ssh joho` 取证：`facts.json` 有 `version`、`rejected` 不外泄、实体页 JSON-LD 有 `version`/`dateModified`
7. strapi-site：构建 → 部署 → 线上验证

**服务器禁止构建**，`dist` 由本地构建后提交。

## 八、风险点

| 风险 | 处理 |
|---|---|
| 审核动作的「状态变更」与「流水写入」非原子 | 先状态后流水；流水失败返回 500 让人核查；极端情况下可能重复记录，可接受 |
| 系统自动重比（`recheck`）产生大量流水 | 仅状态实际变化时写；actor 为空、actorLabel=system，与人工链可区分 |
| 流水表有 `deletedAt`，理论上可被软删=举证链可抹除 | 服务层不暴露任何删除/改写接口，字段仅为满足 CT 约定 |
| 新增 `rejected` 枚举值影响既有判断 | `exportFacts` 白名单为枚举内置名单，天然排除；`verifyAll` 只看 `conflict`，不受影响 |
| `verifiedBy` 仅在 entity 上激活，三表不对称 | 后台列表/详情以流水为准，`verifiedBy` 只作为 entity 的便捷冗余 |