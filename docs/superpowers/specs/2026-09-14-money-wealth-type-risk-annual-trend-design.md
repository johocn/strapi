# 货币理财类型体系 + 特有风险提示 + 7日年化走势 设计文档

**日期**：2026-09-14
**状态**：待用户审阅

---

## 1. 背景与问题

幸福99（产品3，JQB2673J）为银行**现金管理类理财产品**（官网字段 `leixing=活钱管理`），当前存在三个问题：

1. **类型错标**：产品3 被标为 `money-fund`（货币基金），但实际是货币理财（现金管理类理财，受《关于规范现金管理类理财产品管理有关事项的通知》约束），与公募货币基金性质不同；C 端 `getTypeLabel` 显示"货币基金"错误
2. **风险提示缺失**：生产库 `wealth_disclosures` 披露表**为空**，C 端 DisclosureBlock 从未展示任何产品类型特有风险提示，仅剩底部静态免责"理财非存款，产品有风险，投资需谨慎"
3. **净值恒 1 展示无意义**：货币型净值恒为 1，净值走势图为水平线、净值表两列恒 1，对客户无评估价值；用户要求改展示**每日 7 日年化收益**走势

## 2. 目标

1. 新增 `money-wealth`（货币理财）产品类型，产品3 归入，C 端显示"货币理财"
2. 杭银采集器按 `leixing=活钱管理` 自动归类货币理财（未来货币产品不再错标）
3. 披露表新增 `money-wealth` 专属风险提示文案（现金管理新规口径），C 端自动展示
4. 货币型产品（money-wealth/money-fund）详情页净值走势图改"7日年化走势"（官方披露值），净值表改"万份收益/七日年化"两列

## 3. 现状盘点

- 枚举：`wealth-product.schema.json` productType = [bank-wealth, stock-fund, bond-fund, mixed-fund, money-fund]
- 杭银采集器（hzbank-collector.ts:141-144）：按 `touzileixin` 映射，无货币型分支；幸福99 的 `touzileixin=固定收益类`（误判为 bank-wealth 的根源），`leixing=活钱管理` 才是货币型标志
- 收益数据：`wealth_money_incomes`（incomeDate/tenThousandIncome/sevenDayAnnual），产品3 已有 17 条，官方七日年化 `sevenDayAnnual` 有值（0.0188 等）
- C 端：`getProductDetail` 已返回 `latestSevenDayAnnual/latestTenThousandIncome` 但详情页未展示；无收益序列接口；净值走势图/净值表用 `getProductNavSeries`（净值序列）
- 披露：`disclosure-service.getByProductType` 按 productType 精确匹配、回退 `all`；管理端已有增删改查接口；生产表为空
- 监察页（monitor-service）判定不依赖 productType 分支，枚举加值不破坏

## 4. 方案

### 4.1 后端（basic 仓库 zhao-wealth 插件）

1. **枚举**：`wealth-product.schema.json` productType 新增 `money-wealth`
2. **杭银采集器**（hzbank-collector.ts:141-144）：新增分支，优先于 touzileixin 判定：
   ```
   if (d.leixing === '活钱管理') productType = 'money-wealth';
   else if (d.touzileixin === '固定收益类') productType = 'bank-wealth';
   ...
   ```
3. **新增收益序列接口**：`GET /v1/wealth/products/:id/money-incomes`
   - 返回该产品 `wealth_money_incomes` 按 incomeDate 倒序分页（复用 paginatedResponse 格式）
   - 字段：incomeDate / tenThousandIncome / sevenDayAnnual

### 4.2 数据（生产库）

1. 产品3：`UPDATE wealth_products SET product_type = 'money-wealth' WHERE id = 3;`
2. 披露表插入 money-wealth 专属文案：
   - title：`货币理财风险提示`
   - content（现金管理新规口径，拟写稿）：
     > 本产品为银行现金管理类理财产品。产品不保本、不保收益，业绩比较基准仅为参考，不构成收益承诺；产品采用摊余成本法估值，份额净值通常保持稳定，收益以产品实际运作结果为准；投资者应关注产品说明书中关于赎回时效、费用等的约定。理财非存款，产品有风险，投资须谨慎。
   - productType：`money-wealth`，status：true，effectiveDate：2026-09-14

### 4.3 前端（strapi-wealth 仓库）

1. **format.ts**：`getTypeLabel` 新增 `'money-wealth': '货币理财'`
2. **api.ts**：新增 `getProductMoneyIncomes(productId, { pageSize })`（调 4.1-3 接口）
3. **detail.vue**：
   - `isMoneyFund` 扩展为 `isCashManagement`（`money-wealth || money-fund`），卡片"现金管理类"标识、弹窗说明、净值区提示均改用该判断（逻辑不变，类型集合扩大）
   - **净值走势图区**：isCashManagement 时改为"7日年化走势"卡片（官方收益序列画线，Y 轴百分比），隐藏恒 1 净值走势图
   - **净值表区**：isCashManagement 时表头改"日期/万份收益/七日年化"（收益序列），隐藏净值两列；`nav-flat-tip` 提示保留
4. **disclosure-block.vue**：无需改动，`getTypeLabel('money-wealth')` 自动显示"货币理财"标签，披露内容按 productType 自动匹配

### 4.4 不做（明确排除）

- 监察页、管理端适配（枚举加值不破坏现有判定）
- money-fund（真货币基金）类型的展示改造范围外——但收益展示逻辑共用（isCashManagement 覆盖两类）
- 中国理财网/青岛银行采集器的货币型映射（数据源不同，另行评估）

## 5. 测试

后端（TDD）：
1. 收益序列接口：按产品查倒序、分页格式（新增 nav 或 product controller 用例）
2. 杭银采集器映射：`leixing=活钱管理` → money-wealth（新增 hzbank-collector 用例）

前端：构建通过 + 线上人工复核

## 6. 部署

- **basic**：改码 → 测试全过 → 重建 dist（自检命中 money-wealth / money-incomes）→ push → joho pull/restart → SQL（产品3 类型 + 披露插入）→ 接口验证（curl money-incomes 返回 17 条）
- **strapi-wealth**：改码 → `npm run build:h5` → commit/push（wealth-line）→ `deploy-wealth.ps1` → 线上 200 + 人工复核详情页
