# 宁银理财净值采集器（任务 3）

- 日期：2026-09-15
- 范围：zhao-wealth 插件（basic 仓库）+ 管理端（web 仓库 h.joho.cn）

## 1. 背景与目标

需为「宁银理财」产品采集净值数据。目标产品：**ZGN2660096E**（宁银理财宁欣日日薪固定收益类日开理财96号（最短持有7天）-E，登记编码 Z7002126000109）。

目标：
1. 验证宁银官网（www.wmbnb.com）能否采集净值；官网不可达时确认替代网址
2. 新增宁银理财采集器（主源官网 + 备源中国理财网兜底），注册到采集器工厂与管理端
3. 官网提供的逐日年化收益率（incomeratio）随净值入库（`annualYield` 字段）
4. 生产验证：ZGN2660096E 全历史净值采集成功，年化/风险补缺正常

## 2. 侦查结论（joho 服务器实测 2026-09-15）

### 2.1 官网可达性
- 本机访问 www.wmbnb.com 失败（HTTP 000，地域/网络限制）
- joho 服务器：主站 HTTP 200；但所有 `/ningbo-web/product/*.json` 接口被 nginx WAF 按 **TLS 指纹**拦截（curl 带浏览器头、Cookie 会话、HTTP/2 均 403）→ **必须 Playwright 真实浏览器**（与南银 WAF 情形一致）

### 2.2 官网接口（Playwright 实测全部 200）
| 接口 | 参数 | 返回 |
|---|---|---|
| `GET /ningbo-web/product/list.json` | `projectcode` | 产品信息：`id`(登记编码)、`projectname`、`risklevelDesc`、`projecttypeDesc`(净值型)、`projectsetupdate`(成立日)、`trusteename` 等 |
| `GET /ningbo-web/product/funddaytable.json` | `code`+`startdate`+`enddate`+`request_num`+`request_pageno` | 净值分页表：`{status, total, list:[{cdate(ms), netvalue, incomeratio, totalnetvalue}], ishb}` |
| `GET /ningbo-web/product/funddaychart.json` | `code`+`startdate`+`enddate` | 走势：`dateList` + `data1`(单位净值) + `data2`(累计净值) |
| `GET /ningbo-web/product/attachmentlist.json` | `atta_type`+`code` | 公告附件列表 |

注意：`request_num` 服务端有封顶（实测约 13-15 条/页），必须按 `request_pageno` 翻页直到 `list` 为空。

### 2.3 目标产品数据（ZGN2660096E）
- 产品名：宁银理财宁欣日日薪固定收益类日开理财96号（最短持有7天）-E
- 登记编码：Z7002126000109（`list.json` 的 `id` 字段）
- 风险等级：PR2（中低风险）；产品类型：固定收益类净值型；成立日：2026-05-20
- 全历史净值：**65 条**（2026-05-20 → 2026-09-14，最新单位净值 1.010929）
- `incomeratio`：逐日年化收益率（近 7 日年化口径，与净值反算 `(nav_t/nav_{t-7})^(365/7)-1` 完全吻合，范围 1.31%–3.22%）

### 2.4 替代网址
| 来源 | 可用性 | 结论 |
|---|---|---|
| 中国理财网 `xinxipilu.chinawealth.com.cn`（按登记编码） | 已有采集器 `collectByRegisterCode`/`collectNavData(registerCode)` 支持，生产可用 | **采用为兜底源** |
| 宁波银行官网净值公告 ZIP/PDF | 每日 ZIP 仅含部分周期型产品，目标产品不在其中 | 不采用（弱源，PDF 解析成本高） |

## 3. 设计：宁银理财采集器

### 3.1 新增 `ningyin-collector.ts`（仿南银模式）

```ts
class NingyinCollector extends BaseCollector
```

**`collectProductInfo(productCode)`**
- Playwright 会话内 fetch `list.json?projectcode={code}`，取 `list[0]` 映射：
  - `projectname` → `productName`
  - `id` → `registerCode`
  - `risklevelDesc` → `riskLevel`（如「中低风险」）
  - `projecttypeDesc` → 校验为净值型
  - `projectsetupdate` → `issueDate`（ms 时间戳）
  - `company: '宁银理财'`、`productType: 'bank-wealth'`
- 失败返回 null（提示走中国理财网补录登记编码）

**`collectNavData(productCode, { registerCode })`**
- Playwright 会话内 fetch `funddaytable.json`，`request_num=100`（服务端封顶）从 pageno=1 翻页，直到 `list` 为空或为空数组
- 字段映射：`cdate`(ms) → `navDate`（YYYY-MM-DD，复用 toNavDate 逻辑）、`netvalue` → `unitNav`、`totalnetvalue` → `accNav`（缺省回退 unitNav）、`incomeratio` → `annualYield`
- 过滤无效记录（无日期或净值全空），按日期降序
- 全部数据为空 → 抛错 → **自动切中国理财网兜底**：`getChinawealthCollector().collectNavData(code, { registerCode })`

### 3.2 数据入库

**`wealth-nav` schema 新增字段**（`content-types/wealth-nav/schema.json`）：
```json
"annualYield": { "type": "decimal", "precision": 12, "scale": 6 }
```
含义：该净值日期的逐日年化收益率（官网近 7 日年化口径，权威来源），可空（非宁银源产品为 null）。

**`processNavData` 透传 `annualYield`**（`jobs/collect-job.ts`）：
- create 路径：`annualYield` 已在 `navOnly` 内自动透传（无需改动）
- update 路径：补 `annualYield: nav.annualYield ?? existing.annualYield`
- 更新触发条件保持「单位净值不同」不变（annualYield 仅随净值更新一起落库）

**不动现有链路**：年化快照（m1/m3/m6/y1）与风险指标仍由 nav-calculator / risk-metric-service 自算；`annualYield` 作为该日年化依据存档，供展示与校验，不替换自算链路。

### 3.3 注册与配置

- `collectors/collector-factory.ts`：
  - import + `COLLECTOR_MAP` 注册 `'ningyin'` 与 `'宁银理财'`
  - `getAvailableSources()` 追加 `{ value: 'ningyin', label: '宁银理财' }`
- 管理端 `web/src/pages/wealth/collect/index.vue`：数据源下拉追加「宁银理财」选项
- 产品录入：产品代码 `ZGN2660096E`、登记编码 `Z7002126000109`、数据源 `宁银理财`

## 4. 测试

新增单测（仿 nanyin-collector.test.ts，mock playwright-manager）：
1. `funddaytable.json` 响应映射：cdate→navDate、netvalue→unitNav、totalnetvalue→accNav、incomeratio→annualYield
2. 翻页终止：list 为空时停止
3. 兜底：主源抛错时调用中国理财网采集器
4. 无效记录过滤

## 5. 部署与验证

1. 插件 `npm run build` 重建 dist
2. 部署自检：`grep -r ningyin plugins/zhao-wealth/dist` 命中（未命中=未重建）
3. git 提交（源码 + dist）→ `deploy.sh`
4. 生产验证（joho）：
   - 为 ZGN2660096E 配置采集（source=宁银理财）后触发采集，预期新增 65 条净值（2026-05-20 → 2026-09-14），管理端采集中心显示新增数
   - 年化补缺 + 风险指标补缺正常（recalculate-product / recalculate-risk-metric-product）
   - 抽检 `wealth_navs` 中 `annualYield` 与官网 incomeratio 一致（如 2026-09-14 = 1.72）

## 6. 风险与边界

- **Playwright 依赖**：官网与兜底源均需 Playwright，浏览器不可用时采集失败（与南银相同约束，生产已验证可用）
- **2G 内存**：禁止在服务器执行 `npm run build`（本地构建后提交 dist）
- **接口变更**：官网接口路径/字段如变化，采集器需同步更新（failReason 会暴露）
- **翻页封顶**：request_num 服务端封顶，必须翻页拉全量（65 条约 5 页）
- **incomeratio 口径**：为近 7 日年化，仅作该日年化存档；多周期年化快照仍由自算链路产出
