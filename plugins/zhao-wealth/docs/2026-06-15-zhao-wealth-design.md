# zhao-wealth 插件设计文档

## 一、插件概述

### 1.1 项目目标
搭建 Strapi 独立金融插件，管理理财、基金数据，输出时序 JSON 给前端，给客户展示净值、多周期年化趋势图表。

### 1.2 产品分类
| 类型 | 代码 | 说明 |
|------|------|------|
| 银行净值理财 | bank-wealth | 银行理财产品 |
| 股票基金 | stock-fund | 股票型公募基金 |
| 债券基金 | bond-fund | 债券型公募基金 |
| 混合基金 | mixed-fund | 混合型公募基金 |
| 货币基金 | money-fund | 货币市场基金 |

### 1.3 风险等级分类（五级标准）
| 代码 | 名称 | 说明 |
|------|------|------|
| R1 | 低风险 | 本金风险极低 |
| R2 | 中低风险 | 本金风险较低 |
| R3 | 中风险 | 本金有一定风险 |
| R4 | 中高风险 | 本金风险较大 |
| R5 | 高风险 | 本金风险极大 |

---

## 二、数据表结构

### 2.1 银行理财公司表（wealth-company）
```json
{
  "kind": "collectionType",
  "collectionName": "wealth_companies",
  "info": {
    "singularName": "wealth-company",
    "pluralName": "wealth-companies",
    "displayName": "理财公司"
  },
  "attributes": {
    "name": { "type": "string", "required": true },
    "shortName": { "type": "string" },
    "companyType": { "type": "enumeration", "enum": ["bank", "bank-subsidiary"] },
    "website": { "type": "string" },
    "status": { "type": "boolean", "default": true },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
```

### 2.2 产品表（wealth-product）
```json
{
  "attributes": {
    "productCode": { "type": "string", "unique": true, "required": true },
    "productName": { "type": "string", "required": true },
    "productType": { "type": "enumeration", "enum": ["bank-wealth", "stock-fund", "bond-fund", "mixed-fund", "money-fund"] },
    "registerCode": { "type": "string", "unique": true },
    "riskLevel": { "type": "enumeration", "enum": ["R1", "R2", "R3", "R4", "R5"], "default": "R2" },
    "termType": { "type": "enumeration", "enum": ["short", "medium", "long"] },
    "issueDate": { "type": "date" },
    "maturityDate": { "type": "date" },
    "company": { "type": "relation", "relation": "manyToOne", "target": "api::wealth-company.wealth-company" },
    "recommendWeight": { "type": "integer", "default": 0 },
    "recommendTags": { "type": "json" },
    "status": { "type": "boolean", "default": true },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
```

### 2.3 采集配置表（wealth-collect-config）
```json
{
  "attributes": {
    "product": { "type": "relation", "relation": "oneToOne", "target": "api::wealth-product.wealth-product" },
    "collectMethod": { "type": "enumeration", "enum": ["web-crawler", "zip-pdf", "manual", "api"] },
    "collectUrl": { "type": "string" },
    "collectRules": { "type": "json" },
    "collectStatus": { "type": "enumeration", "enum": ["pending", "success", "failed"] },
    "lastCollectTime": { "type": "datetime" },
    "failCount": { "type": "integer", "default": 0 },
    "failReason": { "type": "text" },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
```

### 2.4 净值表（wealth-nav）- 理财+普通基金共用
```json
{
  "attributes": {
    "product": { "type": "relation", "relation": "manyToOne", "target": "api::wealth-product.wealth-product" },
    "navDate": { "type": "date", "required": true },
    "unitNav": { "type": "decimal", "precision": 10, "scale": 4 },
    "accNav": { "type": "decimal", "precision": 10, "scale": 4 },
    "dataSource": { "type": "enumeration", "enum": ["crawler", "manual"] },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
```

### 2.5 货币基金收益表（wealth-money-income）
```json
{
  "attributes": {
    "product": { "type": "relation", "relation": "manyToOne", "target": "api::wealth-product.wealth-product" },
    "incomeDate": { "type": "date", "required": true },
    "tenThousandIncome": { "type": "decimal", "precision": 10, "scale": 6 },
    "sevenDayAnnual": { "type": "decimal", "precision": 10, "scale": 4 },
    "dataSource": { "type": "enumeration", "enum": ["crawler", "manual"] },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
```

### 2.6 年化快照表（wealth-annual-snapshot）
```json
{
  "attributes": {
    "product": { "type": "relation", "relation": "manyToOne", "target": "api::wealth-product.wealth-product" },
    "snapshotDate": { "type": "date", "required": true },
    "annual1d": { "type": "decimal", "precision": 10, "scale": 6 },
    "annual3d": { "type": "decimal", "precision": 10, "scale": 6 },
    "annual7d": { "type": "decimal", "precision": 10, "scale": 6 },
    "annual2w": { "type": "decimal", "precision": 10, "scale": 6 },
    "annual1m": { "type": "decimal", "precision": 10, "scale": 6 },
    "annual3m": { "type": "decimal", "precision": 10, "scale": 6 },
    "annual6m": { "type": "decimal", "precision": 10, "scale": 6 },
    "annual1y": { "type": "decimal", "precision": 10, "scale": 6 },
    "isEstimate": { "type": "boolean", "default": false },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
```

### 2.7 年度收益表（wealth-yearly-return）
```json
{
  "attributes": {
    "product": { "type": "relation", "relation": "manyToOne", "target": "api::wealth-product.wealth-product" },
    "year": { "type": "integer", "required": true },
    "annualReturn": { "type": "decimal", "precision": 10, "scale": 6 },
    "baseDays": { "type": "integer" },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
```

### 2.8 客户自选产品表（wealth-customer-product）
```json
{
  "attributes": {
    "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user" },
    "product": { "type": "relation", "relation": "manyToOne", "target": "api::wealth-product.wealth-product" },
    "channel": { "type": "relation", "relation": "manyToOne", "target": "api::channel.channel" },
    "followTime": { "type": "datetime" },
    "sortOrder": { "type": "integer", "default": 0 },
    "remark": { "type": "string" },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
```

### 2.9 手动推荐配置表（wealth-recommend-config）
```json
{
  "attributes": {
    "product": { "type": "relation", "relation": "oneToOne", "target": "api::wealth-product.wealth-product" },
    "channel": { "type": "relation", "relation": "manyToOne", "target": "api::channel.channel" },
    "recommendOrder": { "type": "integer", "default": 0 },
    "recommendReason": { "type": "text" },
    "status": { "type": "boolean", "default": true },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
```

---

## 三、年化计算逻辑

### 3.1 年化基础公式

#### 净值复利公式（银行理财/股/债/混合基金统一）
```
年化 = (期末净值/期初净值)^(365/区间自然日天数) - 1
```

**参数说明：**
- **期初净值** = 当前日往前推第N个交易日的净值
- **期末净值** = 当日净值
- **区间自然日天数** = 两个净值日期之间的自然日天数（不含起始日，含结束日）

**示例：**
| 场景 | 期初净值日 | 期末净值日 | 自然日天数 | 计算公式 |
|------|------------|------------|------------|----------|
| 1日年化（跨周末） | 2026-06-12 | 2026-06-15 | 3 | `(P15/P12)^(365/3) - 1` |
| 7日年化 | 2026-06-08 | 2026-06-15 | 7 | `(P15/P08)^(365/7) - 1` |

#### 货币基金年化公式（万份收益单利，按自然日）
```
年化 = (周期万份收益总和 ÷ 周期自然天数) × 365 ÷ 10000
```

| 周期 | 自然天数 | 计算公式 |
|------|----------|----------|
| 7日年化 | 7 | `(近7日万份总和 ÷ 7) × 365 ÷ 10000` |
| 近1月年化 | 30 | `(近30日万份总和 ÷ 30) × 365 ÷ 10000` |
| 近3月年化 | 90 | `(近90日万份总和 ÷ 90) × 365 ÷ 10000` |
| 半年年化 | 180 | `(近180日万份总和 ÷ 180) × 365 ÷ 10000` |
| 一年年化 | 365 | `(近365日万份总和 ÷ 365) × 365 ÷ 10000` |

### 3.2 滚动周期交易日取数

| 周期 | 取数规则 | 交易日数量 |
|------|----------|------------|
| 1日 | 当日净值 vs 前1个交易日净值 | 1 |
| 3日 | 当日净值 vs 往前第3个交易日净值 | 3 |
| 7日 | 当日净值 vs 往前第7个交易日净值 | 7 |
| 2周 | 当日净值 vs 往前第14个交易日净值 | 14 |
| 1月 | 当日净值 vs 往前第22个交易日净值 | 22 |
| 3月 | 当日净值 vs 往前第66个交易日净值 | 66 |
| 半年 | 当日净值 vs 往前第125个交易日净值 | 125 |
| 一年 | 当日净值 vs 往前第250个交易日净值 | 250 |

### 3.3 年度收益核算规则

| 产品类型 | 计算规则 |
|----------|----------|
| 银行理财/股/债/混合基金 | 取自然年度首个交易日净值=期初，年度最后交易日净值=期末，套用净值复利公式（自然日天数=年度总天数） |
| 货币基金 | 取全年所有自然日万份收益平均值，×365÷10000作为年度年化 |
| 存续不足完整自然年的产品 | 不生成年度年化数据 |

### 3.4 重算触发机制

| 触发场景 | 重算范围 |
|----------|----------|
| 正常新增当日净值 | 仅计算当日8档滚动年化快照 |
| 手动修改/补录任意一条历史净值 | 1. 该净值日期之后**全部交易日**的滚动年化快照<br>2. 横跨的两个自然年度年度收益 |
| 后台一键全量重算 | 所有产品全部日期滚动快照 + 全部自然年度年化收益 |

### 3.5 边界兜底规则

| 规则 | 说明 |
|------|------|
| 历史净值条数不足目标周期时 | 对应年化字段存`null`，前端不展示 |
| 期初净值异常值检测 | 期初净值不能为0、负数，出现异常值跳过计算并记录错误日志 |
| 货基无万份收益的自然日期 | 填充0参与均值运算 |
| 计算结果精度 | 所有计算结果保留6位小数，前端展示乘以100保留2位百分比 |
| 短期年化标注 | 当区间自然日天数 < 7 时，年化快照增加`isEstimate: true`字段，前端可标注"估算值" |

---

## 四、模块架构

### 4.1 目录结构
```
zhao-wealth/
├── admin/
│   └── src/
│       ├── pages/
│       │   ├── App.tsx
│       │   ├── HomePage.tsx
│       │   ├── ProductPage.tsx
│       │   ├── CompanyPage.tsx
│       │   ├── CollectConfigPage.tsx
│       │   ├── NavDataPage.tsx
│       │   ├── RecommendPage.tsx
│       │   └── CustomerProductPage.tsx
│       ├── utils/
│       │   ├── api.ts
│       │   └── getTranslation.ts
│       ├── index.ts
│       └── pluginId.ts
│       ├── translations/
│       │   ├── en.json
│       │   └── zh-Hans.json
│       └── components/
│       │   ├── Initializer.tsx
│       │   └── PluginIcon.tsx
│       └── custom.d.ts
│       └── package.json
│       └── tsconfig.json
│       └── tsconfig.build.json
├── server/
│   └── src/
│       ├── content-types/
│       │   ├── wealth-company/schema.json
│       │   ├── wealth-product/schema.json
│       │   ├── wealth-collect-config/schema.json
│       │   ├── wealth-nav/schema.json
│       │   ├── wealth-money-income/schema.json
│       │   ├── wealth-annual-snapshot/schema.json
│       │   ├── wealth-yearly-return/schema.json
│       │   ├── wealth-customer-product/schema.json
│       │   ├── wealth-recommend-config/schema.json
│       │   └── index.ts
│       ├── controllers/
│       │   ├── index.ts
│       │   ├── product.ts
│       │   ├── nav.ts
│       │   ├── annual.ts
│       │   ├── recommend.ts
│       │   ├── customer-product.ts
│       │   └── collect.ts
│       ├── services/
│       │   ├── index.ts
│       │   ├── product.ts
│       │   ├── nav-calculator.ts
│       │   ├── recommend-service.ts
│       │   ├── customer-product.ts
│       │   └── annual-snapshot.ts
│       ├── collectors/
│       │   ├── index.ts
│       │   ├── base-collector.ts
│       │   ├── cbhb-collector.ts
│       │   ├── pdf-parser.ts
│       │   └── zip-downloader.ts
│       ├── jobs/
│       │   ├── index.ts
│       │   ├── collect-job.ts
│       │   ├── calculate-job.ts
│       │   └── queue-setup.ts
│       ├── routes/
│       │   ├── index.ts
│       │   ├── content-api.ts
│       │   ├── admin-api.ts
│       ├── policies/
│       │   ├── index.ts
│       │   ├── has-channel-access.ts
│       │   ├── has-product-permission.ts
│       ├── utils/
│       │   ├── trading-day.ts
│       │   ├── annual-formula.ts
│       │   ├── redis-client.ts
│       ├── bootstrap.ts
│       ├── register.ts
│       ├── permissions.ts
│       └── index.ts
│       └── package.json
│       └── tsconfig.json
│       └── tsconfig.build.json
├── docs/
│   ├── backend-admin-api.md
│   ├── backend-content-api.md
│   ├── frontend-api.md
├── tests/
│   ├── annual-calculator.test.ts
│   ├── collector.test.ts
│   ├── recommend.test.ts
│   └── jest.config.js
├── package.json
├── strapi-admin.js
├── strapi-server.js
├── tsconfig.json
```

---

## 五、API接口设计

### 5.1 统一返回包裹体

**成功响应：**
```json
{
  "code": 200,
  "msg": "success",
  "data": { ... }
}
```

**错误响应：**
```json
{
  "code": 403,
  "msg": "无权限访问该渠道产品",
  "data": null
}
```

### 5.2 通用Query参数

所有时序接口支持：
- `startDate`: 开始日期
- `endDate`: 结束日期
- `page`: 页码（默认1）
- `pageSize`: 每页条数（默认100，最大500）

### 5.3 C端查询接口（v1版本）

| 接口 | 路径 | Query参数 | 说明 | 权限 |
|------|------|-----------|------|------|
| 产品列表 | `/api/v1/wealth/products` | `page, pageSize, productType, riskLevel` | 获取可展示产品列表 | 渠道隔离 |
| 产品详情 | `/api/v1/wealth/products/:id` | - | 返回基本信息+风险等级+产品类型+发行机构+成立日期+最新净值 | 渠道隔离 |
| 净值时序 | `/api/v1/wealth/products/:id/nav` | `startDate, endDate, page, pageSize` | 返回净值时间序列 | 渠道隔离 |
| 年化快照时序 | `/api/v1/wealth/products/:id/annual-snapshot` | `startDate, endDate, page, pageSize` | 返回8周期年化时间序列（货基兼容） | 渠道隔离 |
| 年度收益列表 | `/api/v1/wealth/products/:id/yearly-return` | `page, pageSize` | 返回历年年度收益 | 渠道隔离 |
| 推荐产品列表 | `/api/v1/wealth/recommend` | `page, pageSize` | 按组合规则返回推荐产品 | 渠道隔离 |
| 客户自选列表 | `/api/v1/wealth/customer-products` | `page, pageSize` | 仅返回当前用户自选 | 用户+渠道隔离 |
| 添加自选 | `/api/v1/wealth/customer-products` POST | `{productId}` | 用户添加关注 | 用户+渠道隔离 |
| 删除自选 | `/api/v1/wealth/customer-products/:id` DELETE | - | 用户取消关注（仅自己的） | 用户+渠道隔离 |

### 5.4 后台管理接口（v1版本）

| 接口 | 路径 | 入参 | 说明 | 权限 |
|------|------|------|------|------|
| 产品管理CRUD | `/wealth-admin/v1/products` | - | 增删改查 | 管理员 |
| 理财公司管理 | `/wealth-admin/v1/companies` | - | 增删改查 | 管理员 |
| 采集配置管理 | `/wealth-admin/v1/collect-configs` | - | 增删改查 | 管理员 |
| 净值数据管理 | `/wealth-admin/v1/nav-data` | - | 手动录入/修改 | 管理员 |
| 触发采集 | `/wealth-admin/v1/collect/trigger` POST | `{productId?}` | 不传=全量采集，传productId=单产品采集 | 管理员 |
| 采集状态查询 | `/wealth-admin/v1/collect/status` | `{productId?}` | 查看任务状态 | 管理员 |
| 重算年化 | `/wealth-admin/v1/recalculate` POST | `{productId?, startDate?, endDate?}` | 无参数=全量重算 | 管理员 |
| 推荐配置管理 | `/wealth-admin/v1/recommend-configs` | - | 手动推荐配置 | 管理员 |
| 客户自选查看 | `/wealth-admin/v1/customer-products` | `channelId?, page, pageSize` | 渠道管理员看本渠道，超管看全部 | 渠道管理员/超管 |

### 5.5 接口返回格式示例

**净值时序接口返回：**
```json
{
  "code": 200,
  "msg": "success",
  "data": [
    { "date": "2026-06-15", "unitNav": 1.0234, "accNav": 1.1234 },
    { "date": "2026-06-14", "unitNav": 1.0220, "accNav": 1.1220 }
  ]
}
```

**年化快照时序接口返回：**
```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "date": "2026-06-15",
      "annual1d": 0.123456,
      "annual3d": 0.089123,
      "annual7d": 0.065432,
      "annual2w": null,
      "annual1m": null,
      "annual3m": null,
      "annual6m": null,
      "annual1y": null,
      "isEstimate": true
    }
  ]
}
```

---

## 六、采集流程

### 6.1 采集流程图
```
1. Cron触发（每日定时，如18:00）
   ↓
2. 交易日判断（调用trading-day.ts）
   ↓ 非交易日 → 跳过任务
   ↓ 交易日 → 继续
3. Bull队列分发采集任务（Redis分布式锁）
   ↓
4. 采集器工厂选择对应采集器
   ↓ web-crawler → Axios+Cheerio爬取网页
   ↓ zip-pdf → 下载ZIP解压→PDF解析
5. 数据校验入库
   ↓ 成功 → 更新采集状态，触发年化计算任务
   ↓ 失败 → 记录失败原因，重试3次后告警
6. 年化快照生成（nav-calculator.ts）
   ↓
7. 年度收益更新（如有跨年数据变化）
```

### 6.2 渤银理财采集器实现

**产品列表页爬取：**
- URL: `https://www.cbhbwm.com.cn/cbhbwm/gmcp/qbcp/index.html`
- 解析：获取所有产品的销售编号

**产品详情页爬取：**
- URL模板: `https://www.cbhbwm.com.cn/cbhbwm/gmcp/gmxqy/index.html?saleCode={productCode}`
- 解析规则：
  - 产品基本信息：名称、登记编码、风险等级、期限、业绩基准
  - 净值数据：日期、单位净值、累计净值（业绩表现区域）

**采集规则配置示例：**
```json
{
  "collectMethod": "web-crawler",
  "collectUrl": "https://www.cbhbwm.com.cn/cbhbwm/gmcp/gmxqy/index.html?saleCode={productCode}",
  "collectRules": {
    "productInfo": {
      "name": ".product-title",
      "registerCode": ".register-code",
      "riskLevel": ".risk-type"
    },
    "navData": {
      "tableSelector": ".nav-table tbody tr",
      "dateColumn": "td:nth-child(1)",
      "unitNavColumn": "td:nth-child(2)",
      "accNavColumn": "td:nth-child(3)"
    }
  }
}
```

### 6.3 ZIP+PDF采集器预留

```typescript
// zip-downloader.ts
async function downloadAndExtract(url: string): Promise<string[]> {
  // 1. 下载ZIP文件
  // 2. 解压到临时目录
  // 3. 返回PDF文件路径列表
}

// pdf-parser.ts
async function parsePdfNav(filePath: string): Promise<NavData[]> {
  // 使用pdf-parse库解析PDF内容
  // 提取净值表格数据
  // 返回结构化净值数组
}
```

### 6.4 失败重试与告警

| 配置项 | 值 |
|--------|-----|
| 最大重试次数 | 3次 |
| 重试间隔 | 5分钟 |
| 告警方式 | 日志记录 + 可选邮件通知 |
| 告警触发条件 | 连续3次失败或单日失败率>50% |

---

## 七、定时任务与队列配置

### 7.1 Cron定时任务

| 任务 | 触发时间 | 说明 |
|------|----------|------|
| 交易日判断任务 | 每日 08:00 | 检查当日是否为交易日，标记全局状态 |
| 采集任务触发 | 每日 18:00 | 交易日才执行，分发采集任务到Bull队列 |
| 年化快照生成 | 每日 20:00 | 交易日才执行，当日净值入库后计算快照 |

### 7.2 Bull队列配置

| 队列名称 | 任务类型 | 重试策略 | 并发数 |
|----------|----------|----------|--------|
| `wealth-collect` | 采集任务 | 重试3次，间隔5分钟 | 3 |
| `wealth-calculate` | 年化计算任务 | 重试2次，间隔1分钟 | 1 |
| `wealth-recalculate` | 全量重算任务 | 无重试 | 1 |

### 7.3 Redis分布式锁

| 锁名称 | 说明 | 过期时间 |
|--------|------|----------|
| `wealth:collect:lock` | 防止多实例重复采集 | 30分钟 |
| `wealth:calculate:lock` | 防止重复计算 | 10分钟 |
| `wealth:recalculate:lock` | 全量重算互斥 | 60分钟 |

---

## 八、推荐逻辑

### 8.1 推荐优先级规则

| 优先级 | 规则 | 实现方式 |
|--------|------|----------|
| 1 | 手动配置推荐 | 从 `recommend-config` 表读取，按 `recommendOrder` 排序 |
| 2 | 客户偏好匹配 | 根据客户 `riskPreference` 和 `termType` 筛选匹配产品 |
| 3 | 年化收益排名 | 按近一年年化收益降序，作为补充推荐 |

### 8.2 推荐算法流程
```
1. 获取客户信息（riskPreference、termType、channelId）
   ↓
2. 查询手动推荐配置（优先级最高）
   - 按渠道筛选
   - 按 recommendOrder 排序
   - 取前 N 条
   ↓
3. 若手动推荐不足 N 条，补充客户偏好匹配
   - 筛选 riskLevel ≤ 客户 riskPreference 的产品
   - 筛选 termType 匹配的产品
   - 按 recommendWeight 排序
   ↓
4. 若仍不足 N 条，补充年化收益排名
   - 查询近一年年化快照
   - 按年化降序排序
   - 排除已推荐产品
   ↓
5. 合并返回推荐列表（最多 N 条）
```

### 8.3 推荐结果字段
```json
{
  "productId": 123,
  "productName": "渤银理财财收有略六个月2026年41号A款",
  "productType": "bank-wealth",
  "riskLevel": "R2",
  "recommendSource": "manual",
  "recommendReason": "稳健收益，适合中长期投资",
  "annual1y": 0.056789,
  "latestNav": 1.0234
}
```

---

## 九、后台管理界面

### 9.1 页面列表

| 页面 | 功能 | 操作 |
|------|------|------|
| HomePage | 插件首页，展示数据概览 | 统计卡片：产品总数、今日采集状态、待重算任务数 |
| CompanyPage | 理财公司管理 | 表格列表、新增、编辑、启用/停用 |
| ProductPage | 产品管理 | 表格列表、新增、编辑、查看净值曲线、关联采集配置 |
| CollectConfigPage | 采集配置管理 | 表格列表、新增、编辑、配置采集规则、查看采集状态 |
| NavDataPage | 净值数据管理 | 按产品筛选、表格展示、手动录入、编辑历史净值、触发重算 |
| RecommendPage | 推荐配置管理 | 表格列表、设置推荐权重、添加手动推荐、排序调整 |
| CustomerProductPage | 客户自选查看 | 按渠道筛选、查看客户关注产品统计 |

### 9.2 NavDataPage功能详情
- 左侧产品选择器
- 右侧净值表格（日期、单位净值、累计净值、数据来源）
- 支持手动录入单条净值
- 支持批量导入CSV
- 编辑历史净值后自动触发重算提示

### 9.3 CollectConfigPage功能详情
- 产品关联选择
- 采集方法选择（网页爬虫/ZIP+PDF/手动/API）
- 采集规则JSON配置编辑器
- 采集状态展示（成功/失败/待采集）
- 手动触发采集按钮

---

## 十、权限控制

### 10.1 权限体系（复用zhao-auth）

| 角色 | 权限范围 |
|------|----------|
| 管理员 | 全部产品管理、采集配置、年化重算、推荐配置 |
| 渠道管理员 | 本渠道客户自选产品查看、推荐产品查看 |
| 客户（C端用户） | 仅查看自己关注的产品、获取推荐列表 |

### 10.2 自选权限细化

| 角色 | 自选权限 |
|------|----------|
| 普通用户 | 仅增删查自己的自选 |
| 渠道管理员 | 仅查看本渠道客户自选，不可修改删除 |
| 超级管理员 | 可查看全部渠道客户自选 |

---

## 十一、错误处理与日志规范

### 11.1 错误分类

| 错误类型 | 错误码 | 处理方式 |
|----------|--------|----------|
| 权限错误 | 403 | 返回"无权限访问"提示 |
| 参数错误 | 400 | 返回具体参数错误说明 |
| 数据不存在 | 404 | 返回"数据不存在"提示 |
| 计算错误 | 500 | 记录日志，返回"计算异常"提示 |
| 采集失败 | 501 | 记录日志，重试机制触发 |

### 11.2 日志规范

| 日志级别 | 场景 | 格式示例 |
|----------|------|----------|
| INFO | 正常业务流程 | `[zhao-wealth] 采集任务启动，产品数: 10` |
| WARN | 警告但不阻断 | `[zhao-wealth] 产品123净值不足7天，年化标记为估算值` |
| ERROR | 错误需关注 | `[zhao-wealth] 采集失败，产品: CSFB6M26041A，原因: 网络超时` |

### 11.3 异常数据处理

| 异常场景 | 处理方式 |
|----------|----------|
| 期初净值为0或负数 | 跳过计算，年化字段存null，记录ERROR日志 |
| 货基万份收益缺失 | 填充0参与均值计算，记录WARN日志 |
| 历史净值条数不足 | 年化字段存null，不展示，记录INFO日志 |
| PDF解析失败 | 重试3次后标记采集失败，记录ERROR日志 |

---

## 十二、测试策略

### 12.1 单元测试

| 测试模块 | 测试内容 |
|----------|----------|
| annual-formula.ts | 年化公式计算准确性（含边界值） |
| trading-day.ts | 交易日判断逻辑 |
| nav-calculator.ts | 滚动周期取数、重算触发逻辑 |
| recommend-service.ts | 推荐优先级、匹配逻辑 |

### 12.2 集成测试

| 测试场景 | 测试内容 |
|----------|----------|
| 采集流程 | 从触发到入库完整流程 |
| API接口 | C端和后台接口响应正确性 |
| 权限隔离 | 渠道隔离、用户自选权限 |

### 12.3 边界测试

| 测试项 | 验证内容 |
|--------|----------|
| 净值不足周期 | 年化返回null |
| 跨周末1日年化 | 自然日天数=3，isEstimate=true |
| 货基全年收益 | 万份收益均值计算正确性 |

---

## 十三、依赖与配置

### 13.1 新增依赖

| 依赖包 | 用途 |
|--------|------|
| axios | HTTP请求（爬虫） |
| cheerio | HTML解析 |
| pdf-parse | PDF解析（预留） |
| bull | Redis队列任务 |
| ioredis | Redis客户端（复用现有） |

### 13.2 Redis配置（复用zhao-channel）

复用现有 Redis 连接配置，队列名使用 `wealth-*` 前缀区分。

---

## 十四、设计总结

### 14.1 插件核心模块

| 模块 | 职责 |
|------|------|
| 采集模块 | 爬虫采集、PDF解析、数据入库 |
| 计算模块 | 年化公式、滚动周期、年度收益、重算触发 |
| 查询模块 | C端API、后台API、权限隔离 |
| 推荐模块 | 手动推荐、偏好匹配、年化排名 |
| 任务模块 | Cron触发、Bull队列、Redis锁 |

### 14.2 数据表数量

共 **9张数据表**：
1. wealth-company（理财公司）
2. wealth-product（产品）
3. wealth-collect-config（采集配置）
4. wealth-nav（净值）
5. wealth-money-income（货币基金收益）
6. wealth-annual-snapshot（年化快照）
7. wealth-yearly-return（年度收益）
8. wealth-customer-product（客户自选）
9. wealth-recommend-config（手动推荐配置）