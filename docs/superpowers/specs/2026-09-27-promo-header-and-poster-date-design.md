# 设计文档：宣传页两形态头部重构 + 海报日期时间固化两行

日期：2026-09-27
涉及工程：`e:\code\shao`（C 端）、`e:\code\web`（运营端）、`e:\code\basic`（zhao-studio 海报配置 + 落库脚本）

## 背景与现状

活动宣传页（`pages/activity/promo.vue`）分两种形态：带宣传图与不带宣传图。当前问题：

1. **无图形态太简陋**：顶部封面组件 `components/promo/promo-cover.vue` 固定 `340rpx` 高，无 `bgImage` 时退化为一块 `--c-primary → --c-accent` 渐变色块，内部**只有标题与副标题两行字**；而运营端 cover 模块也只开放 `title` / `subtitle` 两个字段（`web/src/pages/activity/promo.vue`）。日期、场地、费用、状态等必读信息全在下方 `promo-info` 模块，首屏没有宣传重点。
2. **带图形态同样漏要素**：日期（必须要素）不压图，用户必须下滑才能看到。
3. **海报日期一行且含硬编码**：`shao/pages/activity/promo.vue` 的 `posterTimeText` 拼成 `${start}—${end} 双节同庆`，格式只有「月.日」、丢失时间，且「双节同庆」写死在代码里；`posterGoodsLines` 首行也写死「进店免费领西瓜 1/4 份」。模板 `promo_share` 为单元素 `activity_time`（24px，高 32px），下方 `activity_venue` 固定 `y=632`，换两行必然挤压后续元素。
4. **模板双源**：海报模板由 basic `zhao-studio` 海报配置提供（`POST /api/zhao-studio/v1/posters/render`），C 端 `utils/poster-templates.ts` 内置模板兜底；落库脚本目前「按 code 查重，命中即跳过」，因此改模板必须同步处理已落库记录。

## 目标

- 统一宣传页头部为**同一套信息结构**，带图与无图只差背景层，首屏即呈现宣传重点与日期时间。
- 头部所有要素**从当前活动数据与配置取值填充，通用模板、不硬编码**，任一要素缺失时**自动降级**（隐藏该行，不出现空行与占位文案）。
- 海报日期时间**固化为「开始 / 结束」两行**，格式统一 `YYYY-MM-DD HH:mm`；同时去掉海报中的活动专属硬编码文案。

## 一、宣传页头部（`components/promo/promo-cover.vue` 重构）

### 结构（带图/无图共用）

```
[背景层]
  有图：image(aspectFill) + 底部渐深遮罩（保证文字可读）
  无图：linear-gradient(135deg, var(--c-primary), var(--c-accent))
[内容层]（底部对齐，自下而上）
  ① 状态徽章（半透明白底 + 白字胶囊）
  ② 标题
  ③ 宣传重点胶囊（白底 + 深色粗体，视觉权重最高）
  ④ 日期时间块（半透明白底圆角块，两行等宽字体）
  ⑤ 场地 · 费用（单行，点分隔；两者都缺则整行隐藏）
```

### 尺寸与配色

| 项 | 取值 |
|---|---|
| 高度 | 无图 `240rpx`（内容行数减少时同步收放）；有图保持 `340rpx` |
| 主色 | `var(--c-primary)`（活动 `promoColors.primary`，未配回落站点默认） |
| 辅色 | `var(--c-accent)`（同上） |
| 有图遮罩 | 底部向上渐深，避免压图后文字不可读 |
| 内容区 | 底部对齐、左右 `40rpx`、行间距 `12rpx` |

渐变底与遮罩都使用活动主题色变量，因此每个活动天然不同色，运营端无需额外配置颜色。

### 要素来源与降级规则（通用模板，禁止硬编码）

| 要素 | 来源 | 缺失时行为 |
|---|---|---|
| 状态徽章 | `activity.status`：`signup_open→报名中`、`ongoing→进行中`、`ended/archived→已结束` | `draft` 不渲染徽章 |
| 标题 | `config.title` → `activity.title` | 空则隐藏该行 |
| 宣传重点 | `config.highlight` → `config.subtitle` | 两者皆空则隐藏胶囊（不留占位） |
| 开始时间 | `activity.startTime` → `YYYY-MM-DD HH:mm` | 空则隐藏该行 |
| 结束时间 | `activity.endTime` → `YYYY-MM-DD HH:mm` | 空则隐藏该行 |
| 日期时间块 | 上面两行 | 两行都空则整块隐藏；仅剩一行时块高等比收缩 |
| 场地 | `activity.venue?.name` → `activity.venueName` | 空则隐藏该项 |
| 费用 | 复用 `promo-info` 现有取值：`pricingMode === 'free'` → 空；`cost/cashPrice <= 0` → `免费`；否则 `${cost}元` | 空则隐藏该项；与场地同时为空则整行隐藏 |
| 副标题 | `config.subtitle` | 与「宣传重点」是同一行的降级关系，不重复渲染 |

日期时间格式化由 `utils/promo-datetime.ts` 的 `formatDateTime` 统一提供（见文末清单），保证宣传页头部与海报两端文案完全一致。

## 二、海报日期时间固化两行

### 模板元素调整（`shao/utils/poster-templates.ts` 的 `promo_share`）

- 删除单元素 `activity_time`，新增两个文本元素：
  - `activity_start`：`y` 取原 `activity_time` 位置，字号 24、色 `#1F2937`、`lineHeight 1.5`
  - `activity_end`：紧接其下（约 `y + 40`），字号 24、色 `#6B7280`（次级），形成层级
- 下游元素整体下移约 `40`：`activity_venue`、`goods_1~4`、`qr_code`、页脚，复核后保证画布 `600×1050` 内无重叠、底部留白不少于 `24`
- 变量清单同步：`requiredVariables` 保持 `[title, main_image, qr_code]`；`optionalVariables` 用 `activity_start` / `activity_end` 替换 `activity_time`

拆成两个元素的直接好处：渲染器逐元素绘制、`content` 为空即跳过（`poster-renderer.ts` 的 `drawText`），因此"只有开始时间没有结束时间"时只画一行，天然降级，不需要额外分支。

### C 端变量构造（`shao/pages/activity/promo.vue`）

- 删除 `posterTimeText`（含写死的「双节同庆」），改为：
  - `posterStartText = formatDateTime(activity.startTime)` → `2026-01-01 08:30`
  - `posterEndText = formatDateTime(activity.endTime)`
  - 格式化规则：24 小时制、各段补零、非法时间或空值返回空串
- `posterConfig.variables` 用 `activity_start` / `activity_end`（替换 `activity_time`）
- 商品行参数化：删除写死的「进店免费领西瓜 1/4 份」，`goods_1~4` 全部由活动数据生成 —— 首行取「宣传重点」（有则占首行，与宣传页共用同一要素），其余按 `goodsList` 每行 2 件拼接（`名称 ¥价格`，无价格只显示名称），整体截取前 4 行；无重点且无商品时该元素为空、自动跳过

### 模板落库同步（`e:\code\basic`）

`scripts/seed-promo-share-poster.cjs` 由「按 code 查重命中即跳过」改为**命中即更新**（模板字段 + 元素全量覆盖），保证后台「内容工作室 → 海报模板」里的 `promo_share` 与 C 端一致；本地验证后在生产执行一次，并 `POST /api/zhao-studio/v1/posters/render` 复核返回的元素数与坐标。

## 三、运营端配置（`e:\code\web`）

- `pages/activity/promo.vue`：cover 模块新增 1 个字段「宣传重点」（`highlight`，单行文本，placeholder 说明"一句话卖点，如：进店免费领西瓜"），不填则 C 端自动降级取副标题；预览区使用与 C 端相同的要素与降级规则渲染。
- `pages/activity/promo-import.js`：AI 提示词中 cover 契约补 `highlight`，要求生成一句卖点短句（不超过 12 字），并明确**不得编造活动时间、场地、费用**——这些由活动数据填充。

## 边界（不做）

- 不改活动详情页 `pages/activity/detail.vue` 的头部（本次只覆盖宣传页 `promo.vue`）。
- 不改海报的元素清单其余部分与画布尺寸（标题、主图、场所、商品、二维码、页脚及 `600×1050` 画布保持原样；仅把日期单元素拆为两个元素、下游元素随之位移、商品行去硬编码）。
- 头部不展示"名额"（保留在活动信息模块）；不新增颜色配置项；不改站点默认色机制。
- 日期时间不加"开始 / 结束"前缀字样，靠上下顺序与颜色层级区分。

## 改动文件清单

| 工程 | 文件 | 改动 |
|---|---|---|
| shao | `components/promo/promo-cover.vue` | 重构为带图/无图共用的信息卡头部 + 降级逻辑 |
| shao | `pages/activity/promo.vue` | 传头部新要素；海报变量拆两行；商品行去硬编码 |
| shao | `utils/promo-datetime.ts`（新建） | 导出 `formatDateTime(iso)`：固定 `YYYY-MM-DD HH:mm`（补零、24 小时制），非法或空值返回空串；宣传页头部与海报共用（现有 `promo-info.vue` 的 `formatTime` 用 `toLocaleString`，格式随环境变化，不采用） |
| shao | `utils/poster-templates.ts` | `promo_share` 日期拆两元素、下游元素位移、变量清单同步 |
| web | `pages/activity/promo.vue` | cover 模块新增「宣传重点」字段 + 预览对齐 |
| web | `pages/activity/promo-import.js` | AI 契约补 `highlight` 并禁止编造时间/场地/费用 |
| basic | `scripts/seed-promo-share-poster.cjs` | 命中即更新；元素结构与坐标同步 |

## 验收要点

1. 无图活动：头部不再是空色块，首屏可见状态、标题、重点、日期两行、场地费用；带图活动：图上同样可见重点与日期，文字在遮罩上可读。
2. 降级：只填开始时只显示一行日期；未填重点时显示副标题；场地与费用都空时该行消失；不出现空行、占位符或残留分隔点。
3. 海报：日期为 `2026-01-01 08:30` / `2026-01-01 09:30` 两行，下方元素无重叠、无越界；换一个活动出图时不再出现「双节同庆」「免费领西瓜」等专属文案。
4. 后台「海报模板」中 `promo_share` 元素数与坐标与 C 端一致，`render` 接口返回 200。
5. 运营端关闭/留空「宣传重点」时，保存与回填均不报错，C 端自动降级。