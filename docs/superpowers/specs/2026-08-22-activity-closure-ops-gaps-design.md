# 活动闭环·运营补全四类缺口 设计文档

> 决策：经缺口盘点，主链 8 大环节（报名/名额/排期/触达/裂变/转化/成效/画像）均已落地，未覆盖缺口集中在四类垂直维度。四类各取最小闭环，按「前后端独立阶段」推进，每阶段单独走 plan → 执行 → 验收。
>
> 现状核实（写稿时已查）：活动服务仅有 C 端操作，管理端 controller 有完整 CRUD；`series-service.duplicate` 已存在且已挂 `POST /adm/activities/:id/duplicate` 路由；shao `activity/list.vue` 无分类/搜索；活动 `status` 枚举为 draft/signup_open/ongoing/ended。

## 四类最小闭环总览

| 阶段 | 最小闭环 | 后端 | 前端 |
|---|---|---|---|
| A 活动前 | 标签分类 + 列表发现 | activity 加 `category`+`tags`；`GET /activities` 支持分类/搜索 | shao 列表分类筛选+搜索；首页发现入口 |
| B 活动后 | 资料/回放下载 | activity 加 `assets`(回放URL+资料附件) | shao 详情页资料/回放区段 |
| C 经营对账 | 归档生命周期 | `status` 枚举加 `archived`；admin 归档/恢复+列表筛选 | web 活动列表归档操作+筛选 |
| D 运营提效 | 活动一键克隆 | 增强 `duplicate` 复制 formConfig/lecturer/venue/resources | web 活动列表「一键克隆」按钮 |

## 阶段 A：标签分类 + 列表发现

**动机**：用户只能看到全部活动，无分类导航与搜索，活动「被发现」的链路缺失。

- 后端 `activity` schema 新增：
  - `category`: string（活动分类，如 讲座/沙龙/工作坊/课程/其他），默认 ""。
  - `tags`: json（字符串数组，如 ["新手","实操"]），默认 []。
- `publicRoute GET /activities`（`activity.list`）增强筛选参数：
  - `category`：精确匹配。
  - `search`：对 `title`（不区分大小写）做 like 匹配。
  - （分页仍用既有 pageSize/page 契约，返回结构与现有 list 保持一致，避免破坏 shao/web 既有消费。）
- 公开 `GET /activities/categories`：返回去重后的分类列表（从 activities 聚合非空 category），供前端分类 chips 渲染。
- 前端 shao `pages/activity/list.vue`：
  - 列表顶部加「全部 + 各分类」横向 chips，点击筛选（重拉 `GET /activities?category=`）。
  - 顶部加搜索框，输入后按 `search` 过滤。
  - 复用现有 `listActivities`（因其透传 query 参数，category/search 需确认透传，必要时扩展）。
- 前端 shao 首页（`pages/index/index.vue`）：新增「发现热门活动」入口卡，跳转 `pages/activity/list`。

**关键口径**：`GET /activities` 返回结构与现契约不变，仅增加可选入参；分类/搜索在服务端过滤，避免 C 端把全量拉到本地。

## 阶段 B：资料/回放下载

**动机**：活动结束后回放与资料无处承接，沉淀内容无法触达参与者。

- 后端 `activity` schema 新增：
  - `assets`: json，结构约定 `{ recordingUrl: string, materials: [{ name, url }] }`，默认 null。
- `publicRoute GET /activities/:documentId`（`activity.detail`）返回 `assets` 字段（加入 detail 的 populate/select）。
- 前端 shao `pages/activity/detail.vue`：当活动 `status=ended`（或始终展示但无数据为空态）时渲染「回放 / 资料」区段：回放（播放视频/外链跳转）、资料列表（点击下载/新窗口打开 url）。
- 管理端 web 活动表单（`pages/activity/form.vue`）支持录入 `assets`（回放 URL 文本框 + 资料 name/url 动态列表）。

**关键口径**：`assets` 结构固定为 `{recordingUrl, materials:[{name,url}]}`，作为前后端契约照用；URL 走既有上传/外链通道，不需新依赖。

## 阶段 C：归档生命周期

**动机**：活动长期堆积在列表，缺少"已结束→归档"的运营归档操作与归档筛选。

- 后端 `activity` schema `status` 枚举追加 `archived`。
- 管理端 controller/service 新增：
  - `POST /adm/activities/:documentId/archive`：`ended` → `archived`（进行中/草稿不归档）。幂等：已是 archived 直接返回。
  - `POST /adm/activities/:documentId/unarchive`：`archived` → 恢复为 `ended`。幂等。
- `activity.adminList` 增加 `status=archived` 筛选（既有 status 过滤复用）。
- 公开 `GET /activities`（`activity.list`）过滤由现 `{ status: { $ne: "draft" } }` 改为 `{ status: { $notIn: ["draft", "archived"] } }`：归档活动彻底下架公开列表；**ended 保持现契约仍可见**，不破坏 shao 既有展示。
- 前端 web `pages/activity/list.vue`：
  - 顶部状态筛选增加「已归档」选项。
  - 行操作新增「归档 / 恢复」按钮（按当前 status 显示其一）。
  - 归档给出确认二次弹窗。

**关键口径**：归档是软归档（改 status），不删数据；公开 C 端不展示 archived（ended 仍可见，保持现契约）。`adminArchive` 仅接受 `ended` 状态（进行中/草稿不归档）。

## 阶段 D：活动一键克隆

**动机**：反复创建同构活动（表单/费用/资源）成本高，缺少一键复刻。

- 现状：`series-service.duplicate` 已实现并挂 `POST /adm/activities/:id/duplicate`，但复制的字段**缺失** `formConfig`（动态报名表单）、`lecturer`/`venue`（资源关系）等。
- 增强 `duplicate`：在现有 copy 基础上补充 `formConfig`、`category`、`tags`、`assets`，并复制资源关系 `lecturer`/`venue`（populate 源活动后取 id 写入 copy）。保留既有行为：清空 startTime/endTime、usedCapacity=0、status=draft、title 加「（副本）」。
- 前端 web `pages/activity/list.vue`：行操作新增「一键克隆」→ 调用 duplicate 接口 → 成功 toast 并刷新；点击后跳转副本编辑（可选，最小集先不做自动跳转，仅刷新列表，副本在列表可见）。

**关键口径**：`duplicate` 只复制模板性配置（表单/费用字段/资源关系），时间槽与报名数据清空；不复制已报名 signup/评价积分数据（报名数据与活动强绑定，复制无意义）。副本 status 强制 draft。

## 不做（超出本轮最小闭环）

- 成本-收益对账卡（选了归档，未选对账卡，留待后续）。
- 优秀学员排行、沉淀续推、带参投放归因、置顶推荐、报名名单导出。（未列入四类选中项。）

## 阶段化执行约定

- 每阶段独立：plan（zhao-point 增量 + shao/web 前端）→ subagent-driven 执行 → `scripts/accept-<stage>.cjs` 端到端验收 → 三仓库按记忆映射收口。
- 前端仓库（web/shao）改动后须 `npm run build:h5` 再提交 dist。
- 阶段 A 起始为 Phase A（活动前）；B/C/D 顺延。可并行/按序由用户定。