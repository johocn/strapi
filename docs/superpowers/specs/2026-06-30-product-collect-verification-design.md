# 理财产品双源采集与交叉校验设计

## 背景与目标

运营添加理财产品时，手动录入效率低且易出错。本设计实现：输入产品编码或名称 → 自动从理财公司官网采集 → 用中国理财网交叉校验 → 运营确认入库。

**核心目标**：数据准确、流程高效、差异可追溯。

**非目标**：
- 不做定时批量采集（后续增量）
- 不实现其他理财子公司采集器（仅渤银理财，架构支持扩展）
- 不做净值自动采集（仅产品基础信息）
- 不绕过中国理财网验证码（Playwright 模拟正常浏览器访问）

## 采集流程

```
运营输入销售编码（如 CSFB1Y26152）或产品名称关键词
    ↓
① 后端启动 Playwright，访问渤银理财官网
   - 列表页：https://www.cbhbwm.com.cn/cbhbwm/gmcp/qbcp/index.html
   - 搜索/定位目标产品 → 提取：名称/销售编码/登记编码/风险/期限/日期/业绩基准
    ↓
② 用登记编码（Z7008426000484）查询中国理财网
   - API：POST /lcxp-platService/product/getProductList
   - 提取：官方全称/登记编码/发行机构/产品状态/投资性质/运作模式/风险等级/期限类型
    ↓
③ 字段对比 → 标记差异
    ↓
④ 返回结构化数据 + 差异标记给前端
    ↓
⑤ 运营确认 → 入库（差异写入 remark 字段）
```

## 采集器架构

```
collectors/
├── base-collector.ts          # 保留（抽象基类）
├── cbhb-collector.ts          # 重写：Playwright 采集渤银官网
├── chinawealth-collector.ts   # 新增：Playwright 采集中国理财网
└── collector-factory.ts       # 新增：根据公司选择采集器
```

### collector-factory.ts

```typescript
const COLLECTOR_MAP = {
  '渤银理财': CbhbCollector,
  // 后续扩展其他公司
};

function getCollector(companyName: string) {
  const Cls = COLLECTOR_MAP[companyName];
  return Cls ? new Cls() : null;
}
```

### 渤银官网采集字段映射

| 渤银官网字段 | → | product 表字段 | 数据类型 |
|-------------|---|--------------|---------|
| 产品名称 | → | productName | string |
| 销售编码 | → | productCode | string |
| 登记编号 | → | registerCode | string |
| 中低风险 | → | riskLevel | 枚举映射：中低风险→R2 |
| 封闭型 | → | termType | 枚举映射 |
| 产品募集起始日 | → | issueDate | date |
| 产品到期日 | → | maturityDate | date |
| 业绩比较基准 | → | benchmark | string（新增字段） |
| (通过产品系列推断) | → | productType | 枚举映射 |
| (固定) | → | company | 关联 wealth_company |

### 风险等级映射（常量）

```
低风险→R1, 中低风险→R2, 中风险→R3, 中高风险→R4, 高风险→R5
```

### 中国理财网校验字段映射

| 理财网字段 | → | 对比 product 字段 | 对比规则 |
|-----------|---|-----------------|---------|
| 产品名称 | → | productName | 包含关系（理财网全称含官网简称即可） |
| 登记编码 | → | registerCode | 精确匹配 |
| 风险等级 | → | riskLevel | 语义匹配（二级(中低)→R2） |
| 期限类型 | → | termType | 语义匹配（6-12个月→medium） |
| 投资性质 | → | productType | 语义匹配（固定收益类→bank-wealth） |
| 产品状态 | → | status | 新增/在售→true |

### 期限类型映射（常量）

```
3-6个月(含)→short, 6-12个月(含)→medium, 1-3年(含)→long
日开/周开/定开→short, 封闭型→根据到期日计算
```

## Schema 变更

### wealth-product 新增字段

```json
"benchmark": { "type": "string" },
"remark": { "type": "text" }
```

- `benchmark`：业绩比较基准（如 "2.40%-2.70%"），从渤银官网采集
- `remark`：校验差异备注，自动生成，运营可修改

### Migration 004

路径：`server/database/migrations/004_add_benchmark_remark_to_product.js`

- 给 `wealth_products` 表新增 `benchmark`(varchar) 和 `remark`(text) 列
- 签名 `up({ db })`

## 后端接口

### POST `/products/collect`

请求：
```json
{ "source": "cbhb", "query": "CSFB1Y26152" }
```

响应：
```json
{
  "code": 0,
  "data": {
    "sourceData": {
      "productCode": "CSFB1Y26152",
      "productName": "渤银理财财收有略一年2026年152号",
      "registerCode": "Z7008426000484",
      "riskLevel": "R2",
      "riskLevelRaw": "中低风险",
      "productType": "bank-wealth",
      "termType": "medium",
      "issueDate": "2026-06-24",
      "maturityDate": "2027-07-22",
      "benchmark": "2.40%-2.70%"
    },
    "officialData": {
      "productName": "渤银理财财收有略系列固定收益类一年封闭式理财产品2026年152号",
      "registerCode": "Z7008426000484",
      "riskLevel": "R2",
      "riskLevelRaw": "二级(中低)",
      "productType": "bank-wealth",
      "productTypeRaw": "固定收益类",
      "termType": "medium",
      "termTypeRaw": "6-12个月(含)",
      "companyName": "渤银理财有限责任公司",
      "productStatus": "待售",
      "operationMode": "封闭式净值型"
    },
    "verification": {
      "status": "partial_match",
      "matchScore": 0.8,
      "differences": [
        {
          "field": "productName",
          "sourceValue": "渤银理财财收有略一年2026年152号",
          "officialValue": "渤银理财财收有略系列固定收益类一年封闭式理财产品2026年152号",
          "severity": "info",
          "description": "官网简称 vs 理财网全称"
        },
        {
          "field": "riskLevel",
          "sourceValue": "中低风险",
          "officialValue": "二级(中低)",
          "severity": "info",
          "description": "表述不同，含义一致"
        }
      ]
    }
  }
}
```

### POST `/products/collect/confirm`

请求：
```json
{
  "productCode": "CSFB1Y26152",
  "productName": "渤银理财财收有略一年2026年152号",
  "registerCode": "Z7008426000484",
  "productType": "bank-wealth",
  "riskLevel": "R2",
  "termType": "medium",
  "issueDate": "2026-06-24",
  "maturityDate": "2027-07-22",
  "benchmark": "2.40%-2.70%",
  "company": 5,
  "remark": "[采集校验] 产品名称：官网简称...风险等级：含义一致。",
  "recommendEnabled": false,
  "status": true
}
```

响应：与现有 `productCreate` 一致（含自动创建 collect-config）。

## 前端交互

### 采集入口

产品管理 → 产品列表页顶部新增"采集产品"按钮：

```
[采集产品] [新增产品] [导入]
```

点击"采集产品"→ 打开 ModalDrawer（抽屉弹窗，宽度 720px）。

### 采集交互 4 步流程

**Step 1：输入查询**

- 数据源下拉：当前仅"渤银理财"，后续加其他公司
- 输入框支持销售编码（精确）或名称关键词（模糊）
- 点击"开始采集"→ 调用 POST `/products/collect`

**Step 2：双源对比展示**

- 左列：渤银官网数据
- 右列：中国理财网数据
- 差异行黄色高亮（info级）/ 橙色（warning级）/ 红色（error级）
- 差异级别定义：
  - `info`：表述差异但含义一致（如风险等级"中低风险"vs"二级(中低)"）
  - `warning`：数值差异需关注（如业绩基准不同）
  - `error`：关键数据不一致（如登记编码不匹配）

**Step 3：确认入库（可编辑）**

- 默认值：官网数据优先（更详细，有日期/业绩基准）
- 产品名称：运营可选择用官网简称或理财网全称
- 校验备注：自动生成，写入 remark 字段，运营可修改
- 点击"确认入库"→ 调用 POST `/products/collect/confirm`

**Step 4：入库成功**

- 显示产品名+编码
- "查看产品"→ 跳转产品详情/编辑页
- "继续采集"→ 回到 Step 1
- "关闭"→ 关闭抽屉

## Playwright 管理

### 生命周期

- **初始化**：bootstrap 中启动 Browser 实例（单例），注册到 strapi 全局
- **使用**：每次采集请求创建新 Page，用完关闭 Page
- **销毁**：插件 destroy 时关闭 Browser

### 并发控制

- 单 Browser 实例，Page 串行创建（避免并发冲突）
- 采集请求排队：内存队列（Array + async processing），非 Bull 队列（采集不需要持久化）
- 超时：30 秒，超时返回错误提示运营手动录入

### 错误处理

- 浏览器启动失败 → 降级返回错误，不崩溃
- 页面加载超时 → 返回友好错误信息
- 目标产品未找到 → 返回"未找到匹配产品"
- 中国理财网查询失败 → 仅返回官网数据，校验标记为 `verification_failed`

## 权限

```typescript
'wealth-product': {
  actions: ['find', 'findOne', 'create', 'update', 'delete', 'collect', 'collectConfirm'],
},
```

## 文件变更清单

### 新增
- `server/src/collectors/chinawealth-collector.ts` — 中国理财网 Playwright 采集器
- `server/src/collectors/collector-factory.ts` — 采集器工厂
- `admin/src/pages/Product/CollectDrawer.tsx` — 采集抽屉弹窗（4 步流程）
- `server/database/migrations/004_add_benchmark_remark_to_product.js` — 新增字段

### 重写
- `server/src/collectors/cbhb-collector.ts` — 占位符→Playwright 实现

### 修改
- `server/src/controllers/admin-api.ts` — +2 接口：collect + collectConfirm
- `server/src/routes/admin-api.ts` — +2 路由
- `server/src/permissions.ts` — +collect/collectConfirm actions
- `server/src/content-types/wealth-product/schema.json` — +benchmark + remark
- `server/src/content-types/index.ts` — 同步 schema
- `admin/src/pages/Product/ProductList.tsx` — +采集按钮 + CollectDrawer
- `admin/src/hooks/useApi.ts` — +2 接口调用

## 验证标准

1. 输入销售编码 CSFB1Y26152 → 采集成功，返回双源数据
2. 登记编码 Z7008426000484 在中国理财网精确匹配
3. 产品名称差异（简称 vs 全称）标记为 info 级
4. 风险等级差异（不同表述）标记为 info 级
5. 确认入库后，产品表含 benchmark + remark 字段
6. 入库后自动创建 collect-config 记录
7. Playwright 单例运行，多次采集不启停浏览器
8. 采集超时（30秒）返回友好错误

## 风险点

1. **Playwright 依赖**：服务端需安装 Chromium，约 200MB。生产环境需确认容器支持。
2. **并发限制**：单 Browser 串行 Page，多请求排队。MVP 可接受（运营手动触发，频率低）。
3. **反爬风险**：中国理财网已有验证码机制，当前 Playwright 未触发，但随时可能升级。
4. **官网变化**：渤银官网改版需重新适配采集器。
5. **Strapi v5 schema 重建**：新增字段后需删除 strapi_database_schema 表记录触发重建。

## 后续规划

- 扩展其他理财子公司采集器（工银/建信/招银等）
- 净值数据自动采集（产品详情页有净值表格）
- 定时批量采集 + 差异告警
- 采集历史记录（谁在什么时候采集了什么）
