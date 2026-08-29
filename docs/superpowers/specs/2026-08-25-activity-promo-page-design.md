# 活动宣传落地页（模块化积木 × 5 风格 × 报名分流）设计

> 关联既有设计：`2026-08-25-activity-meeting-time-quickpick-design.md`（表单时间增强）、`2026-08-24-activity-reward-v2-design.md`（报名权益）、`2026-08-25-activity-signup-time-design.md`（报名时间）

## 1. 背景与目标

线下活动报名引导需要一个**活动宣传落地页**：通过分享链接/海报二维码进入，向潜在客户展示活动介绍、联系方式与报名入口，并**用权益引导客户留下更多信息**（复用已落地的报名奖励机制）。

**目标：**
1. **模块化「搭积木」**：预置一组内容模块，运营在每个活动中自由增删/排序，页面布局多样化不千篇一律
2. **5 种风格预设**：风格 = 配色基调 + 默认模块编排 + 补充资料建议，运营可再调整
3. **报名流程按环境分流**：微信环境走权益引导留信息；浏览器环境走普通报名
4. **联系方式**：加微信 / 电话联系 / 加名片 / 客服留言（异步回复）

## 2. 总体架构

```
活动数据 activity schema（标题/时间/地点/介绍/讲师/奖励…）────────┐
站点默认联系方式 site-config.extraConfig.promoContact ────────────┼─→ C端宣传落地页 promo.vue
运营端编辑器（活动表单新增「宣传设置区」）→ 写入 promo 三字段 ────┘      模块渲染 × 风格 × 报名分流 × 联系方式
                                                                   └→ 客服留言 activity-message（zhao-point 扩展）
                                                                        运营端「留言管理」查看/回复
```

- **数据流单向**：宣传页只读活动数据 + 站点默认联系配置；运营端编辑器写回 `activity.promo*` 三字段
- **复用优先**：报名提交/权益引导/unlock-check 复用现有 `signupActivity`/`openRewardGuide` 流程，不重写

## 3. 数据源与字段映射

宣传页数据**自动取活动字段**（运营无需重复填写）：

| 活动字段 | 用途 |
|---|---|
| title / type / category / tags | 标题、分类、标签 |
| startTime / endTime | 时间展示 |
| venueName / lat / lng | 地点展示（可唤起地图） |
| capacity / usedCapacity | 名额与余量 |
| cashPrice / pointsCost / pricingMode | 费用展示 |
| description | 活动介绍富文本（rich 模块默认内容） |
| lecturer / venue 关系 | 嘉宾/讲师模块、场地模块 |
| assets | 封面图、图片墙素材（默认取 assets.materials） |
| status | 报名按钮状态（draft/signup_open/ended/archived） |
| formConfig | 报名表单字段集（补充资料） |
| rewardConfig | 报名权益（rewards 模块 + 解锁引导） |
| questionnaire | 问卷解锁（survey 条件） |

## 4. 模块清单（12 个积木）

每个模块 = `{ type, config, sort }`。`config` 为该模块的自定义内容；`type` 决定渲染组件与配置表单。

| type | 模块 | 可配置内容 | 数据来源 | 说明 |
|---|---|---|---|---|
| `cover` | 封面横幅 | 主标题/副标语/背景图 | 活动字段+配置 | 头图大横幅，风格化配色 |
| `info` | 基本信息条 | 无（自动） | 活动字段 | 时间/地点/名额/费用/状态 |
| `rich` | 活动介绍 | 富文本 | description 默认，可改 | 正文模块 |
| `highlights` | 亮点列表 | 标题 + 要点[] | 运营填 | 活动亮点/你将获得 |
| `speakers` | 嘉宾讲师 | 文案可选 | lecturer 关系 | 复用讲师资源展示 |
| `agenda` | 议程大纲 | 标题 + 条目[{t,title,desc}] | 运营填 | 议程/课程大纲/流程 |
| `images` | 图片墙 | 图[]（多图） | 运营传 | 往期照片/场地实景 |
| `rewards` | 报名权益 | 无（自动） | rewardConfig | 权益清单 + 解锁条件提示 |
| `contact` | 联系方式 | 微信/电话/名片/留言 | 站点默认+活动覆盖 | 见 §8 |
| `message` | 客服留言 | 无（自动） | 留言会话 | 进入客服对话 |
| `faq` | 常见问题 | 标题 + 问答[] | 运营填 | 可折叠问答 |
| `custom` | 自定义块 | 标题 + 富文本 + 图[] | 运营填 | 自由图文块（搭积木能力） |

> `cover`/`info`/`rewards`/`contact`/`message` 为高复用模块，默认编排必含；其余按风格带出或运营自加。

## 5. 5 种风格预设

**风格 = 配色基调 + 默认模块编排 + 补充资料建议（报名表单字段集）**。选模板时自动带出，运营可改。

| 风格 | 配色基调 | 适用 | 默认模块编排 | 补充资料建议 |
|---|---|---|---|---|
| `summit` 尊享峰会 | 深蓝黑底+金色 `#c9a24b` | 论坛/发布会/年度大会 | cover→info→rich→speakers→agenda→rewards→contact→message | 公司、职位 |
| `salon` 沙龙社交 | 白底+蓝紫 `#6366f1` | 读书会/交流会/兴趣沙龙 | cover→info→rich→highlights→speakers→faq→rewards→contact→message | 昵称、兴趣方向 |
| `training` 培训教育 | 白底+绿 `#059669` | 培训/工作坊/讲座 | cover→info→agenda→speakers→faq→rewards→contact→message | 职业、学习目标 |
| `action` 活力行动 | 高饱和红橙 `#ef4444`/`#f97316` | 公益/户外/招募 | cover→info→highlights→images→rewards→contact→message | 联系电话、紧急联系人 |
| `life` 温馨生活 | 暖粉 `#db2777` | 亲子/兴趣/社区 | cover→rich→images→info→rewards→contact→message | 同行人数、孩子年龄 |

- 配色通过 CSS 变量注入（主色 `--c-primary`、背景、强调、按钮）
- 模块组件按风格微调圆角/间距/卡片形态，避免千篇一律
- **补充资料**：选择风格后自动把建议字段集填入活动 `formConfig`（作为初始值，运营可增删），报名时复用现有表单渲染；同时配合权益解锁条件（contact/survey）引导填写

## 6. 数据存储设计

### 6.1 activity schema 新增三字段（zhao-point）

```json
"promoTemplate": { "type": "string", "default": "summit" },          // 风格枚举
"promoModules":  { "type": "json" },                                  // [{type, config, sort}]
"promoContact":  { "type": "json" }                                   // 活动级联系方式覆盖（null=用站点默认）
```

> 遵循既有约定：`formConfig`/`rewardConfig` 均为 json 字段，`promoModules` 同模式；不新增 relations。

### 6.2 站点默认联系方式（site-config `extraConfig`）

```json
"promoContact": {
  "wechat": { "qrcode": "图片URL", "id": "wxid_xxx" },
  "phone": "13800000000",
  "card": { "name": "王小明", "title": "活动顾问", "company": "某某教育", "avatar": "图片URL", "wechat": "wxid_xxx", "phone": "13800000000" },
  "notice": "如无法报名，请添加顾问微信"
}
```

### 6.3 客服留言模型 activity-message（zhao-point 新增 content-type）

| 字段 | 类型 | 说明 |
|---|---|---|
| activity | relation(activity) | 所属活动 |
| user | relation(up_users) | 留言用户 |
| content | text | 留言内容 |
| reply | text | 运营回复 |
| status | enumeration `[open, replied]` | 默认 open |
| repliedAt | datetime | 回复时间 |

## 7. 运营端：活动表单「宣传设置区」

在 `web/src/pages/activity/form.vue` 新增 `宣传设置` section（位于报名设置之后、发布前），包含：

1. **模板选择**：5 张风格卡片单选；选中后确认弹窗「将重置模块编排与报名表单补充字段？」（避免误覆盖）
2. **模块列表**：
   - 每模块行：名称 + 类型标识 + `上移/下移/删除` 按钮 + 点击展开配置表单
   - 底部 `添加模块`：弹出模块类型选择（12 种）
   - 模块配置表单按 `type` 渲染不同字段（富文本/多图上传/条目列表等，复用现有上传组件）
3. **联系方式**：`使用站点默认` 开关；关闭时显示微信二维码上传、微信号、电话、名片（姓名/职位/公司/头像/微信/电话）
4. **补充资料**：复用现有 formConfig 编辑（模板选中后带出默认字段集）

**提交**：`promoTemplate`/`promoModules`/`promoContact` 随活动提交；服务端校验 `promoModules` 结构合法（type 在枚举内、sort 有序）。

## 8. C端宣传落地页 promo.vue

新增 `shao/pages/activity/promo.vue`，路由 `?act=<documentId>`（分享链接/海报二维码进入）。

### 8.1 模块渲染

- 拉取聚合接口返回 `{ activity, modules, contact, rewards, signupStatus }`
- `v-for` 渲染 `promoModules`，`switch(type)` 分发到 12 个模块组件（`shao/components/promo-*/`）
- 风格类名注入根节点（`promo-summit` 等）→ CSS 变量配色

### 8.2 报名流程分流（环境判断复用 `utils/env.ts`）

- **微信环境**（`MP-WEIXIN` 或 `isWechatBrowser()`）：
  1. 未登录 → 静默授权登录（snsapi_base，复用现有机制）
  2. 点击报名 → **权益引导弹窗**（复用 detail.vue 的 openRewardGuide：展示奖励清单、wechat_auth/contact/survey 解锁步骤）→ 完善信息解锁 → 提交
  3. 登录用户静默（`loginAuth=false`）仅解锁 `condition=none` 奖励，页面提示补齐信息解锁更多权益
- **浏览器环境**：
  1. 未登录 → 本地/SSO 登录
  2. 点击报名 → **普通报名表单**（复用现有 formConfig 渲染），页面仍展示权益清单但不强制解锁

### 8.3 联系方式交互（复用 detail.vue 报名提交/奖励引导）

- **加微信**：微信二维码大图弹层，长按识别；另提供「复制微信号」按钮
- **电话联系**：`tel:` 一键拨号
- **加名片**：电子名片卡片弹层（头像/姓名/职位/公司/微信/电话）→ 一键拨号 / 复制微信号 / **保存到通讯录（vCard）**
- **客服留言**：进入留言面板，发消息 → 存储 activity-message；历史消息列表内可查看运营回复（拉取我的留言接口）

### 8.4 分享与海报

- `onShareAppMessage`：分享卡片（标题/封面/路径带 act）
- **生成海报**：canvas 合成（封面图/纯色背景 + 活动标题 + 时间地点 + 宣传页二维码）→ 长按保存；无封面图时用风格主色背景兜底

### 8.5 已报名用户

- 已报名：底部按钮显示「查看报名凭证」→ 到场二维码/状态（复用 detail.vue 凭证逻辑）
- 候补/取消/已结束：按钮对应状态展示，禁止重复报名

## 9. 后端接口（zhao-point 扩展）

**C端（public/my 前缀）：**

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/zhao-point/v1/promo/activity/:id` | 宣传页聚合：活动+模块+合并联系方式+奖励+本人报名状态 |
| POST | `/api/zhao-point/v1/my/activity/:id/message` | 用户留言（content） |
| GET | `/api/zhao-point/v1/my/activity/:id/messages` | 我的留言+运营回复列表 |
| （复用） | `/my/activity/:id/unlock-check`、报名、签到 | 现有接口不动 |

**运营端（admin 前缀）：**

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/zhao-point/v1/activity-messages?activity=&status=` | 留言列表（含用户信息） |
| PUT | `/api/zhao-point/v1/activity-messages/:id/reply` | 运营回复（status→replied, repliedAt） |
| （扩展） | activity create/update | 读写 `promoTemplate/promoModules/promoContact` |

**运营端留言管理页**：新增 `web/src/pages/activity/messages.vue`（列表：活动筛选、未回复优先、点击回复弹层）。

## 10. 边界 / 风险 / 验收要点

**边界（YAGNI）：**
- 不改动现有 detail.vue 报名/签到/取消核心逻辑，宣传页复用其弹窗与提交流程
- 不新增依赖：canvas 海报用原生 canvas API；vCard 用 `data:text/vcard` 下载
- 客服为异步留言，不做实时在线/推送（后续可迭代）

**风险与对策：**
| 风险 | 对策 |
|---|---|
| vCard 在 iOS Safari / 微信内下载差异 | 提供「复制信息」兜底按钮 |
| canvas 海报跨域图片污染 | 海报图用站内已上传图或纯色兜底 |
| `promoModules` 结构非法导致渲染崩溃 | 服务端 schema 校验 + C端渲染容错（未知 type 跳过） |
| 模板重置误覆盖运营配置 | 选风格弹确认，仅带出未编辑过的默认编排 |
| 微信未关注用户留言/权益受限 | 复用现有订阅条件判断，不新增逻辑 |

**验收要点：**
1. 运营端：5 风格切换带出默认编排/配色/补充字段；模块增删+上移下移+自定义块配置
2. C端：模块按编排渲染、风格配色生效、布局差异明显
3. 报名分流：微信环境走权益引导解锁；浏览器环境普通表单报名
4. 联系方式：加微信/拨号/名片 vCard/留言闭环（留言→运营回复→用户可见）
5. 分享：链接直达宣传页；海报生成可保存、扫码进入
6. 边界：候补/已报名/已结束按钮状态正确；模块非法数据不崩溃

## 11. 实施拆分建议

单 spec，实现按 3 个 plan 顺序推进：
1. **后端 plan**：zhao-point schema 三字段 + activity-message 模型 + C端聚合/留言接口 + 运营端留言接口 + 控制器注册
2. **运营端 plan**：form.vue 宣传设置区（模板选择/模块编辑器/联系方式/补充字段）+ messages.vue 留言管理
3. **C端 plan**：promo.vue + 12 模块组件 + 风格 CSS + 报名分流 + 分享海报 + 联系方式交互
