# 营销文案 A/B 效果统计 · 架构评估与改造建议（修正版）

> 日期：2026-10-07
> 状态：设计评审稿（本轮仅交付架构评估与改造建议，不写功能代码）
> 范围：`strapi`（后端，`zhao-studio` 插件）+ `strapi-backend`（TAdmin 运营后台）+ `xiaoxiaole`（游戏端）

---

## 0. 一句话结论

**能承接，且改造量很小。** 平台已经内置一套完整的「广告发布 + 曝光/点击统计」子系统（Studio 模块的 `publish-platform` / `ad-zone` / `ad-slot` / `ad-content` / `browser-log` / `stat-summary` / `analytics`），你要的「发布渠道 / 广告位 / 文案 / 曝光点击 / CTR 聚合」**全部已有底座**。真正要补的只有三件事：

1. 给 `ad-content`（文案）打上 **A/B 分组** 并关联 **发布渠道（publish-platform）** 与 **广告位（ad-slot）**；
2. 把曝光/点击事件**归因到具体文案 + 四维**（目前 `browser-log` 只归因到 `adSlot`，没有 creative/channel/method）；
3. 在运营后台加一个 **A/B 对比报表**（各文案 CTR、按渠道/位置/方式拆分、胜出文案）。

> ⚠️ 重要纠正：**`zhao-channel` 不是发布渠道，不要复用它。** `zhao-channel` 是「邀请 / 分销 / 成员 / 权限」体系（见 `strapi-backend/src/api/channel.js` 的 invite / members / permissions）。文章/广告的发布渠道是抖音、头条、微信等，对应 Studio 的 **`publish-platform`**；广告位对应 **`ad-slot` / `ad-zone`**。这两套体系已经存在，无需从零新建，只需「打通关联 + 加 A/B 维度」。

---

## 1. 需求回顾

- 宣传消消乐，分享时要准备**多套文案**（微信转发 标题 / 描述 / 图片 / 海报）。
- 用**数据**而非猜测判断「哪个效果更好」：统计 **发布渠道 / 发布位置 / 发布方式 / 发布文案** 的 **点击率（CTR）与广告效果**，用数据选优。
- 交付两点：① 评估 `strapi` 与 `strapi-backend` 能否承接、是否需改造、改造建议；② 营销方案如何快速发布到 `strapi`。

---

## 2. 现有可复用资产（已盘点，带文件指针）

### 2.1 后端 `strapi`（`zhao-studio` 插件）

| 实体（content-type） | 含义 | 关键字段 | 文件指针 |
|---|---|---|---|
| `publish-platform` | **发布渠道/平台** | `type` 枚举：`toutiao / xiaohongshu / wechat / douyin / bilibili / taobao / pdd / douyin-ecom / jd / custom / internal`；`category`、`isActive`、`accounts` | `types/generated/contentTypes.d.ts` `PluginZhaoStudioPublishPlatform` |
| `ad-zone` | **广告区域**（桥接到广告位） | `code`(唯一)、`adSlotCode`(字符串，关联 ad-slot.code)、`adContents`(oneToMany ad-content)、`displayMode` | `contentTypes.d.ts` `PluginZhaoStudioAdZone` |
| `ad-slot` | **广告位/槽**（= 发布位置） | `code`(唯一)、`position` 枚举：`article-content / sidebar / footer / header / list-page / home-page`；`type`：`product-link / banner / popup / native`；`targetUrl`、`imageUrl`、`isActive` | `contentTypes.d.ts` `PluginZhaoStudioAdSlot` |
| `ad-content` | **广告素材 / 文案创意** | `adZone`(必填→ad-zone)、`contentType`：`single-image/multi-image/slideshow/video/html`、`displayStyle`：`banner/card/modal/inline/float/fullscreen`、`title`、`subtitle`、`images[]`、`linkUrl`、`cta*`、`isActive`、`startAt/endAt`、`frequencyLimit`、`priority`、`sortOrder` | `contentTypes.d.ts` `PluginZhaoStudioAdContent`；表单 `strapi-backend/src/pages/studio/ad-content/edit.vue` |
| `browser-log` | **曝光/点击事件原始日志** | `eventType`：`page-view / ad-click / scroll / read-duration / user-register`；`adSlot`(→ad-slot)、`article`、`sessionId`、`userId`、`userAgent`、`ip`、`referrer`、`deviceType`、`timestamp` | `contentTypes.d.ts` `PluginZhaoStudioBrowserLog`；设计 `docs/superpowers/specs/2026-06-16-zhao-studio-analytics-design.md` |
| `stat-summary` | **按日聚合的统计汇总** | `date`、`adSlot`、`summaryType`：`article-daily/ad-slot-daily/global-daily/device-daily/region-daily`、`pv/uv/clickCount/clickRate`、`deviceStats/regionStats/referrerStats`(JSON) | `contentTypes.d.ts` `PluginZhaoStudioStatSummary` |
| `poster-template` | **海报模板** | 海报模板 + 元素 | `strapi-backend/src/pages/studio/poster-template/edit.vue`；`studio.js` `posterTemplateApi` |
| `publish-record` | **发布记录** | 内容 × 账号 × 平台 的发布流水 | `strapi-backend/src/pages/studio/publish-record/*` |
| `analytics` service | 统计服务 | `trackPageView / trackAdClick / trackReadBehavior` + `getOverview/getArticleStats/getAdSlotStats/getDeviceStats/getRegionStats/getUserStats` | `docs/superpowers/specs/2026-06-16-zhao-studio-analytics-design.md` |
| `channel-adapter` | **真实发布到外部平台** | 已能把内容推到 抖音/小红书/微信/头条/B站（OAuth + 各平台 payload） | `docs/superpowers/specs/2026-10-04-zhao-studio-multimedia-publish-design.md` §2.2 |
| `stats` API | 6 维度统计查询 | `/admin/stats/overview|articles|ad-slots|devices|regions|users` | `strapi-backend/src/api/studio.js` `statsApi` |

### 2.2 运营后台 `strapi-backend`（TAdmin，UniApp + Vant + echarts）

- 广告体系页已存在：`pages/studio/ad-content/*`、`ad-zone/*`、`ad-slot/*`、`publish-platform/*`、`publish-record/*`、`stat-summary/*`、`analytics/*`、`poster-template/*`。
- 接口封装：`src/api/studio.js`（`adContentApi`、`adZoneApi`、`adSlotApi`、`publishPlatformApi`、`statSummaryApi`、`statsApi`、`posterTemplateApi`、`publishActionApi`）。
- 统计看板页已有 echarts 基础，可直接扩展 A/B 报表。

### 2.3 游戏端 `xiaoxiaole`

- `bin/wechat-share.js`：当前为**静态分享**（title/desc/imgUrl 写死，仅微信内 JS-SDK 转发）。
- `src/core/SsoAuth.ts`：`buildShareUrl()` 负责拼分享链接。
- 已暴露 `window.__setWechatShare({title,desc,link,imgUrl})` 可用于设置真实微信转发卡片。

---

## 3. 用户四维 → Studio 实体 映射表（核心）

| 用户维度 | 用户原话示例 | 现有 Studio 实体 | 现有字段 | 缺口（需改造） |
|---|---|---|---|---|
| **发布渠道** | 抖音、头条、微信… | `publish-platform` | `type`(toutiao/douyin/wechat…) | `ad-content` 需新增 `platform` 关联（manyToOne → publish-platform） |
| **发布位置（广告位）** | 朋友圈、信息流、开屏… | `ad-slot`(`position`) + `ad-zone`(`adSlotCode`) | `ad-slot.position` 枚举 | `ad-content` 经 `adZone.adSlotCode` 间接可达；建议新增 `adSlot` 直接关联，便于报表 |
| **发布方式** | 转发卡片 / 海报 / 链接 | `ad-content.displayStyle` / `contentType` | `banner/card/modal/inline/float/fullscreen` 或 `single-image/video/html` | 建议新增显式 `method` 枚举：`forward-card / poster / link`（与用户心智对齐，报表更清晰） |
| **发布文案（创意）** | 标题/描述/图片/海报 | `ad-content` | `title/subtitle/images/linkUrl` | 新增 `abGroup`（A/B 分组）+ 关联 渠道/位置/方式；作为「分享文案」实体复用 |

> 结论：**不需要新建 `marketing-creative / impression / click` 三张表**（这是初版草案的误判）。`ad-content` 即文案、`browser-log` 即事件、`stat-summary` 即聚合，全部复用，只做「扩展字段 + 打通关联 + 加 A/B 维度」。

---

## 4. 改造清单（按缺口）

### 4.1 内容模型扩展（Schema，改动小）

- **`ad-content`** 新增字段：
  - `platform`：`relation(manyToOne → publish-platform)` —— 绑定发布渠道（对应「发布渠道」维度）。
  - `adSlot`：`relation(manyToOne → ad-slot)` —— 直接绑定广告位（对应「发布位置」维度，避免经 ad-zone 间接跳转）。
  - `method`：`enumeration[forward-card, poster, link]` —— 发布方式（转发卡片/海报/链接）。
  - `abGroup`：`string` —— A/B 分组标识（同一活动的多套文案用同一 `abGroup` 区分 A/B/C）。
  - （可选）`scope`：`enumeration[website, share]` —— 区分「站外广告」与「游戏内分享文案」，便于过滤。
- **`browser-log`** 新增字段（事件归因到创意+四维）：
  - `adContent`：`relation(manyToOne → ad-content)` —— 归因到具体文案。
  - `platform`：`string`（或 relation）→ 发布渠道。
  - `method`：`string` → 发布方式。
  - `abGroup`：`string` → 分组（冗余存储，便于聚合）。
- **`stat-summary`** 扩展：
  - 新增 `adContent` 关联 + `platform` + `abGroup` 字段；
  - `summaryType` 枚举新增 `ad-content-daily` / `ab-daily`，用于按文案/分组聚合 CTR。
- **`ad-slot.position` 枚举**按需扩充（如 `moments` 朋友圈、`feed` 信息流、`splash` 开屏），对齐用户口中的「位置」。

> 兼容性与部署：均为**新增字段/枚举值**，不破坏现有数据；沿用现有部署流程（`npm run build` → dist → 服务器 pm2 restart）。

### 4.2 事件采集与归因（复用 analytics service）

- 复用 `analytics.trackAdClick` / `trackPageView`，**入参增加 `adContentId / platform / method / abGroup`**，写库时落到 `browser-log` 新字段。
- 游戏端分享时：拉取「生效 + 匹配 渠道/位置/方式」的 `ad-content` → 拼 `?c=<adContentId>&ch=<platform>&pos=<adSlot>&m=<method>` 到分享链接 → 展示/转发上报 `page-view`（impression）、被打开上报 `ad-click`（click）。
- 数据质量：同设备/会话 24h 内同 `adContent` 仅记一次 impression（去重）；`ad-click` 必须晚于 `page-view`；归因窗口 7 天闭合。

### 4.3 聚合与报表（复用 stat-summary + stats API）

- 在现有 `aggregation` 服务新增 `aggregateAdContentDaily`：按 `adContent` 分组算 PV/UV/点击/CTR；新增 `aggregateAbDaily`：按 `abGroup` 聚合，输出每组 CTR 与胜出组。
- `stats` API 扩展：`/stats/ad-contents`（按文案）、`/stats/ab`（按分组）。复用现有 6 维度查询风格。
- **TAdmin A/B 报表页**（新建 `pages/studio/ab-report/`）：顶部维度筛选（渠道/位置/方式），中部各文案 CTR 排名条形图 + 胜出文案高亮，底部维度拆分与样本量/置信提示（样本不足不强行选优）。视觉对齐现有 `studio/stat-summary` 与 `conversion-funnel`（echarts 卡片化看板）。

### 4.4 游戏端闭环（接口契约，后续实现）

- `GET /zhao-studio/v1/content/ad-contents/active?platform=&adSlot=&method=` → 返回匹配的生效 `ad-content`（title/subtitle/images/linkUrl + adContentId）。
- `POST /zhao-studio/v1/analytics/exposure`（impression）与 `/click`（click），body 携带 `adContentId / platform / method / abGroup / sessionId / ua / ip`。
- 接入点：`xiaoxiaole` 的 `wechat-share.js` 与 `SsoAuth.buildShareUrl()`，复用 `window.__setWechatShare`。

### 4.5 快速发布（表单 + 脚本）

- **TAdmin 表单（无代码，已具备）**：运营在 `pages/studio/ad-content/edit.vue` 录入文案，`publish-platform` 维护渠道，`ad-slot` 维护广告位；通过 `publish-record` + `channel-adapter` 可**真实发布到抖音/头条/微信**。只需在表单里补 `platform / adSlot / method / abGroup` 四个字段（4.1）。
- **批量导入脚本（铺量）**：`scripts/import-marketing.mjs`（Node）调用 Strapi REST Admin API 批量创建 `ad-content` / `publish-platform`，支持 CSV/JSON；状态=`isActive=true` 才被游戏端拉取。可参考现有 `strapi/scripts/seed-poster-templates.cjs`、`seed-website-test-data.js` 的写法。

---

## 5. 端到端数据流

```
运营 TAdmin(ad-content 表单) + 批量脚本
        │ 创建/导入（含 platform/adSlot/method/abGroup）
        ▼
[(Strapi) ad-content + publish-platform + ad-slot]   ← 四维定义
        │ 游戏端拉取「生效 + 匹配维度」文案
        ▼
{xiaoxiaole 分享} ──拼 link ?c=&ch=&pos=&m=──▶ 微信转发/海报/链接
        │                                        │
        │ 展示/转发                              │ 被打开
        ▼                                        ▼
 POST /analytics/exposure (impression)      POST /analytics/click
        │                                        │
        └──────────▶ [browser-log + 新字段] ◀────┘
                                │ GROUP BY adContent/platform/adSlot/method/abGroup
                                ▼
              [stat-summary: ad-content-daily / ab-daily]  (CTR/胜出)
                                │ 报表 API
                                ▼
              TAdmin A/B 报表页 (echarts) ──▶ 用数据选优
```

---

## 6. 风险与注意

- **维度关联间接**：当前 `ad-content → ad-zone →(adSlotCode 字符串)→ ad-slot`，报表取「位置」需 join 字符串，建议 4.1 直接加 `adSlot` 关联。
- **样本量**：低量级（千级/天）下，单文案曝光可能不足，报表需设「最小样本阈值 + 置信提示」，避免小样本误判胜出。
- **去重/防刷**：游戏端分享与点击易刷，归因窗口与频控复用 `ad-content.frequencyLimit` 思路。
- **不要误用 `zhao-channel`**：它是分销/邀请体系，与本次「发布渠道」无关。

---

## 7. 与初版草案的差异（说明）

初版计划误将 `zhao-channel` 当作发布渠道，并打算新建 `marketing-creative / impression / click` 三张表。经核查，`zhao-studio` 已内置 `publish-platform`(渠道) / `ad-slot`+`ad-zone`(广告位) / `ad-content`(文案) / `browser-log`(事件) / `stat-summary`(聚合) / `channel-adapter`(真实发布)。故本修正版**改为复用现有实体、仅做扩展字段 + 打通关联 + 加 A/B 维度 + 加 A/B 报表**，改造量从「新建三表 + 服务」降为「扩展字段 + 扩展聚合 + 一个报表页」。

---

## 8. 后续实现阶段（本次不写代码，待设计评审后执行）

| 阶段 | 任务 | 仓库 |
|---|---|---|
| P0 Schema | 扩展 `ad-content`(platform/adSlot/method/abGroup/scope)、`browser-log`(adContent/platform/method/abGroup)、`stat-summary`(adContent/platform/abGroup + 新 summaryType)；`ad-slot.position` 枚举扩充 | strapi |
| P1 采集 | `analytics` service 入参扩展 + 路由开放 `exposure/click`；游戏端 `wechat-share.js`/`SsoAuth` 接入拉取与回传 | strapi + xiaoxiaole |
| P1 聚合 | `aggregation` 新增 `aggregateAdContentDaily` / `aggregateAbDaily`；`stats` API 扩展 `ad-contents`/`ab` | strapi |
| P1 报表 | TAdmin 新建 `pages/studio/ab-report/`（echarts，A/B 对比 + 胜出结论） | strapi-backend |
| P2 发布 | TAdmin 表单补 4 字段；`scripts/import-marketing.mjs` 批量导入（CSV/JSON） | strapi-backend + strapi/scripts |
| P2 验证 | 浏览器/真机：配置 A/B 两组文案 → 分享回流 → 报表出现 CTR 对比与胜出 | 本机 |
