# 促销海报弹窗瘦身 + 海报模板纳入 basic 配置 设计

2026-09-27

## 目标

1. 「分享海报」弹窗去掉标题栏与外框，变成纵向两部分：上=海报图片，下=按环境渲染（微信内不渲染任何节点，普通浏览器渲染「保存图片」）。
2. 把促销海报（`promo_share`）注册进 basic 的 zhao-studio 海报配置，让海报图内元素可由后台维护；C 端保留本地内置模板兜底。

## 现状约束（已核实）

- C 端弹窗组件 `shao/components/share-poster/share-poster.vue`：遮罩 `rgba(0,0,0,.7)` + 650rpx 白底圆角卡片，含 `.poster-header`（「分享海报」标题 + ×）、`.poster-body`（30rpx 内边距）、`.poster-footer`（提示文案 + 渐变「保存图片」按钮，微信内也显示）。图片显示宽度按容器 650rpx 计算并做 `posterShift` 左移补偿。
- `shao/pages/activity/promo.vue` 传入 `templateCode: 'promo_share'` 与变量 `title / main_image / activity_time / activity_venue / goods_1~4`；二维码由组件内 `buildVariables()` 注入 `qr_code`（`direct` 模式，内容是分享 URL）。
- `shao/utils/poster-renderer.ts`：`case "image"` 走 `ctx.drawImage(img, x, y, width, height)`，**忽略 `imageFit`**，即图片按画框拉伸；`parseGradientColor()` 支持 `#gradient:from,to` 约定（用于 `elementBgColor`）。
- `shao/utils/poster-templates.ts` 内置 `promo_share`：600×1050，渐变条（`shapeGradient`）+ 主图 540×465 + 标题/时间/场所 + goods_1~4 + 二维码 170 + 页脚，坐标见下表。
- basic 海报配置**有效可用**（生产实测）：插件在 `config/plugins.ts` 启用；后台入口「内容工作室 → 海报模板」；`content-api.ts` 提供公开 `POST /api/zhao-studio/v1/posters/render` 与 admin CRUD；生产已有 4 个模板（brand_share / course_share / activity_share / product_share，均 600×1000）。
- **缺口**：`promo_share` 未注册 → 渲染接口返回 `404 POSTER_001 Template not found`，C 端一直回落本地内置模板，后台改配置对这张海报无效。
- `poster-element` schema **无 `shapeGradient` 字段**，渐变只能用 `elementBgColor = '#gradient:EF4444,F97316'` 表达；admin 元素表单可配 类型/Key/变量/坐标/尺寸/文字样式/圆角边框/图片适配/二维码，够用。
- 边界：海报配置只管**海报图内部元素**，管不了弹窗外壳（遮罩、按钮、悬浮 ×）。

## 关键决策

1. **关闭交互**：删除标题栏 ×，改为图片右上角悬浮半透明圆形 ×（挂在图片层，不属于外框），H5 与非 H5 一致；点遮罩空白处关闭保留。
2. **图片尺寸**：`areaW = innerWidth - 48rpx(换算 px)`，`areaH = 0.88 * innerHeight`，`scale = min(areaW/w, areaH/h)` 等比居中；**删除 `posterShift` 左移补偿**及对应 `transform`。
3. **底部按环境**：普通浏览器渲染「保存图片」；**微信内不渲染任何节点**（连提示文案也没有），长按图片保存（`show-menu-by-longpress` 保留）。非 H5（小程序）保留原有保存到相册按钮。
4. **配置落库策略**：新增幂等脚本把 `promo_share` 写入 basic 海报配置（模板 + 11 个元素），C 端**保留**本地内置模板兜底 —— 后端 404 或异常时回落，海报不会白屏。
5. **渐变表达**：模板里渐变条用 `elementBgColor = '#gradient:EF4444,F97316'`（`shapeGradient` 落不了库），C 端 `parseGradientColor` 解析结果与内置模板视觉一致。
6. **不改渲染器**：本次不动 `poster-renderer.ts`（`imageFit` 未实现属既有行为，主图 540×465 与 1200×1034 主视觉比例接近 1.16 vs 1.16，无可见变形）。

## 弹窗结构（整改后）

```
.poster-overlay (fixed, rgba(0,0,0,.7), 点空白 close)
├── .poster-stage                 # 无底色容器，纵向堆叠，居中
│   ├── .poster-image-wrap        # 相对定位，尺寸=图片显示尺寸
│   │   ├── <image .poster-img>   # 等比缩放，长按可保存
│   │   ├── .poster-close-float   # 右上角悬浮 ×（半透明圆底）
│   │   └── .poster-loading       # 生成中 spinner（保留）
│   └── .poster-actions           # 微信内不渲染
│       └── .save-btn             # 「保存图片」（H5 非微信 / 非 H5）
```

删除的样式：`.poster-container`（白底卡片）、`.poster-header`、`.poster-title`、`.poster-close`（头部 ×）、`.poster-footer`、`.poster-tip`、`.poster-body`(scroll-view)、`.poster-shift` 相关 transform。

## 新旧差异对照

| 维度 | 旧 | 新 |
|---|---|---|
| 外框 | 650rpx 白底圆角卡片 + 阴影 | 无卡片无外框，直接叠遮罩 |
| 头部 | 「分享海报」标题 + 右侧 × | 整块删除 |
| 结构 | 头 / 主体(scroll) / 底 三段 | 两段（图 + 按环境底部） |
| 底部提示 | 微信「长按图片即可保存到手机相册」/ 浏览器「点击下方…」 | 全删 |
| 保存按钮 | 微信与浏览器都显示 | 仅普通浏览器；微信内 DOM 零节点 |
| 关闭 | 点 × 或点遮罩 | 悬浮 × 或点遮罩 |
| 图片可视面积 | 扣头部+底部+60rpx 内边距，另有左移补偿 | 少扣约 190px + 内边距，放大 15~20% |

## 落库数据（promo_share）

模板：`name=促销活动海报`、`code=promo_share`、`canvasWidth=600`、`canvasHeight=1050`、`backgroundColor=#FFFFFF`、`backgroundMode=cover`、`isActive=true`、`isDefault=false`、`site=首个 site-config`、`requiredVariables=[title, main_image, qr_code]`、`optionalVariables=[activity_time, activity_venue, goods_1..goods_4]`。

元素（与 C 端内置模板逐一对齐）：

| sortOrder | elementKey | 类型 | 变量 | 坐标/尺寸 | 关键样式 |
|---|---|---|---|---|---|
| 1 | gradient_bar | shape(rect) | - | 0,0 600×6 | `elementBgColor='#gradient:EF4444,F97316'`, z=1 |
| 2 | main_image | image | main_image | 30,40 540×465 | borderRadius=12, imageFit=cover, z=2 |
| 3 | title | text | title | 30,530 540×44 | 34px #1F2937 bold 左对齐 lineHeight 1.2 |
| 4 | activity_time | text | activity_time | 30,592 540×32 | 24px #6B7280 左对齐 |
| 5 | activity_venue | text | activity_venue | 30,632 540×32 | 24px #6B7280 左对齐 |
| 6 | goods_1 | text | goods_1 | 30,678 540×32 | 22px #1F2937 左对齐 |
| 7 | goods_2 | text | goods_2 | 30,713 540×32 | 同上 |
| 8 | goods_3 | text | goods_3 | 30,748 540×32 | 同上 |
| 9 | goods_4 | text | goods_4 | 30,783 540×32 | 同上 |
| 10 | qr_code | qrcode | qr_code | 215,822 170×170 | `qrContentMode=direct`, qrSize=170, z=10 |
| 11 | footer_text | text | - | 30,1005 540×30 | content=长按识别二维码 · 查看活动详情, 22px #9CA3AF 居中 |

## 数据流

点「分享海报」→ `drawPoster()` → `POST /api/zhao-studio/v1/posters/render {templateCode:'promo_share', variables}` → 200 用后端 elements（传入变量优先、`defaultValue` 兜底）→ 404/异常回落 `resolveTemplateLocal` → canvas 渲染 → H5 `toDataURL` 展示 → 微信长按保存 / 浏览器点按钮下载。

## 验收

1. shao：`npm run build:h5` → `deploy-h5.ps1`（期望 `SYNC_OK`）。
2. Playwright 双 UA：
   - 普通 UA：无标题、无白色外框、无底部提示；有「保存图片」；点空白关闭；悬浮 × 可关闭。
   - MicroMessenger UA：底部零节点（无提示无按钮），仅悬浮 ×；点遮罩关闭。
3. basic：执行 seed 脚本 → 后台「海报模板」由 4 个变 5 个且可见 `promo_share` → `POST /posters/render {templateCode:'promo_share'}` 返回 200 且 elements 数为 11 → 活动页海报与内置模板视觉一致。
4. 后台改一个元素坐标（如 title `y`）→ 生产活动页海报**不发版即时生效**（证明配置真被消费）。

## 风险

- `qr_code` 元素在后端模板里是变量模式：`resolveTemplate` 对 `isVariable && variableName='qr_code'` 且 `qrContentMode='direct'` 时走 `variables.qr_code || defaultValue`，C 端 `buildVariables()` 已注入分享 URL，行为与内置模板一致。
- 落库脚本幂等：已存在 `code=promo_share` 时跳过，避免重复插入元素。
- 悬浮 × 覆盖图片右上角约 64rpx 区域，会遮住海报渐变条右端极小面积，可接受。