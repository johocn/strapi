# 理财机构数据初始化设计

## 背景

zhao-wealth 插件的 wealth_companies 表当前为空，需导入中国所有持牌理财子公司 + 吉林银行数据，作为产品管理与采集监控模块的基础数据。

## 目标

导入 33 条理财机构数据到 wealth_companies 表：
- 32 家持牌银行理财子公司（截至 2025 年末）
- 1 家吉林银行（自营理财业务）

## 数据范围

### 32 家理财子公司构成

| 类型 | 数量 | companyType | 明细 |
|------|------|-------------|------|
| 国有大行理财子 | 6 | bank-subsidiary | 工银/建信/中银/农银/交银/中邮 |
| 股份行理财子 | 12 | bank-subsidiary | 招银/兴银/信银/光大/浦银/民生/华夏/平安/渤银/浙银/恒银/华夏 |
| 城商行理财子 | 8 | bank-subsidiary | 杭银/宁银/徽银/南银/苏银/青银/上银/北银 |
| 农商行理财子 | 1 | bank-subsidiary | 渝农商 |
| 合资/外资理财子 | 5 | joint-venture | 高盛工银/施罗德交银/贝莱德建信/汇华/法巴农银 |
| 银行自营 | 1 | bank | 吉林银行 |

## Schema 变更

### `server/src/content-types/wealth-company/schema.json`

`companyType` 枚举新增 `joint-venture` 值：

```json
"companyType": {
  "type": "enumeration",
  "enum": ["bank", "bank-subsidiary", "joint-venture"],
  "default": "bank-subsidiary"
}
```

`content-types/index.ts` 已通过 `import` 引用 schema.json，无需改动。

## 数据文件

**路径**：`server/src/data/wealth-companies.json`

**结构**（33 条记录）：

```json
[
  {
    "name": "工银理财有限责任公司",
    "shortName": "工银理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.icbc.com.cn",
    "status": true
  },
  ...
]
```

**website 字段规则**：
- 理财子公司有独立官网则填独立官网
- 无独立官网（归母行）则填母行官网
- 合资/外资公司无公开官网则留空字符串

## Migration 脚本

**路径**：`server/database/migrations/003_seed_wealth_companies.js`

### 职责

1. 读取 `wealth-companies.json` 数据文件
2. 对每条记录：
   - 先查 name 是否已存在（knex select）
   - 存在则跳过
   - 不存在则 insert，生成 document_id
3. 幂等可重复执行

### 关键约束

- 签名 `up({ db })`，不能写 `up(db)`
- 表名 `wealth_companies`（Strapi snake_case）
- 字段名 snake_case：`short_name` / `company_type` / `created_at` / `updated_at`
- 插入时生成 `document_id`（用 `crypto.randomUUID()`，Node 内置无依赖）
- 数据文件路径：`path.join(__dirname, '../../src/data/wealth-companies.json')`

### 脚本骨架

```javascript
'use strict';

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

async function up({ db }) {
  const dataPath = path.join(__dirname, '../../src/data/wealth-companies.json');
  const companies = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  for (const company of companies) {
    // 查重
    const existing = await db('wealth_companies')
      .where({ name: company.name })
      .first();

    if (existing) {
      continue;
    }

    // 插入
    await db('wealth_companies').insert({
      document_id: crypto.randomUUID(),
      name: company.name,
      short_name: company.shortName,
      company_type: company.companyType,
      website: company.website,
      status: company.status,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }
}

module.exports = { up };
```

## 文件清单

**新增**：
- `server/src/data/wealth-companies.json`（33 条数据）
- `server/database/migrations/003_seed_wealth_companies.js`

**修改**：
- `server/src/content-types/wealth-company/schema.json`（+joint-venture 枚举）

## 验证方式

1. 启动 Strapi，migration 自动执行
2. 查询 wealth_companies 表，预期 33 条记录
3. 验证字段：name/short_name/company_type/website/status/document_id 均有值（website 可空）
4. 验证 companyType 分布：6 国有 + 12 股份 + 8 城商 + 1 农商 + 5 合资 + 1 银行 = 33
5. Strapi admin → 理财公司管理页面，能看到 33 条记录
6. 重复启动 Strapi，记录数仍为 33（幂等验证）

## 风险点

1. **Schema 重建**：新增枚举值后需删除 `strapi_database_schema` 表中 wealth-company 记录触发重建，或手动执行 force migration
2. **website 完整性**：部分合资/小众理财子公司官网信息难查全，留空可接受（website 非 required）
3. **document_id 格式**：crypto.randomUUID() 生成 36 字符 UUID，Strapi v5 document_id 接受此格式
4. **Migration 幂等**：重名跳过，避免重复执行产生重复数据

## 非目标

- 不采集产品数据（仅导入机构）
- 不做官网 URL 真实性验证
- 不新增 parentBank 等扩展字段
- 不做合资公司的股权关系建模
