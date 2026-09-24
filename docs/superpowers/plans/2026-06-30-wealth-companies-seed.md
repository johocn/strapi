# 理财机构数据初始化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 导入 33 条理财机构数据（32 家持牌理财子公司 + 吉林银行）到 wealth_companies 表，新增 joint-venture 枚举值。

**Architecture:** Schema 加 joint-venture 枚举 → 静态 JSON 数据文件 → Migration 脚本幂等插入。复用 zhao-common migration-runner 机制自动执行。

**Tech Stack:** Strapi v5 + Knex + Node crypto

**Spec:** `docs/superpowers/specs/2026-06-30-wealth-companies-seed-design.md`

---

## Task 1: 扩展 companyType 枚举

**Files:**
- Modify: `basic/plugins/zhao-wealth/server/src/content-types/wealth-company/schema.json`

- [ ] **Step 1: 修改 schema.json 的 companyType 字段**

读取 `basic/plugins/zhao-wealth/server/src/content-types/wealth-company/schema.json`，找到第 16 行：

```json
"companyType": { "type": "enumeration", "enum": ["bank", "bank-subsidiary"], "default": "bank-subsidiary" },
```

改为：

```json
"companyType": { "type": "enumeration", "enum": ["bank", "bank-subsidiary", "joint-venture"], "default": "bank-subsidiary" },
```

仅新增 `"joint-venture"` 一个枚举值，其余字段保持不变。

- [ ] **Step 2: 验证 index.ts 无需改动**

读取 `basic/plugins/zhao-wealth/server/src/content-types/index.ts`，确认第 3 行是 `import wealthCompany from './wealth-company/schema.json';`，通过 import 引用，无需改动。

---

## Task 2: 创建数据文件

**Files:**
- Create: `basic/plugins/zhao-wealth/server/src/data/wealth-companies.json`

- [ ] **Step 1: 创建 wealth-companies.json**

完整内容（33 条记录）：

```json
[
  {
    "name": "工银理财有限责任公司",
    "shortName": "工银理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.icbc.com.cn",
    "status": true
  },
  {
    "name": "建信理财有限责任公司",
    "shortName": "建信理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.ccb.com",
    "status": true
  },
  {
    "name": "中银理财有限责任公司",
    "shortName": "中银理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.boc.cn",
    "status": true
  },
  {
    "name": "农银理财有限责任公司",
    "shortName": "农银理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.abchina.com",
    "status": true
  },
  {
    "name": "交银理财有限责任公司",
    "shortName": "交银理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.bankcomm.com",
    "status": true
  },
  {
    "name": "中邮理财有限责任公司",
    "shortName": "中邮理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.psbc.com",
    "status": true
  },
  {
    "name": "招银理财有限责任公司",
    "shortName": "招银理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.cmbchina.com",
    "status": true
  },
  {
    "name": "兴银理财有限责任公司",
    "shortName": "兴银理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.cib.com.cn",
    "status": true
  },
  {
    "name": "信银理财有限责任公司",
    "shortName": "信银理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.citicbank.com",
    "status": true
  },
  {
    "name": "光大理财有限责任公司",
    "shortName": "光大理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.cebbank.com",
    "status": true
  },
  {
    "name": "浦银理财有限责任公司",
    "shortName": "浦银理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.spdb.com.cn",
    "status": true
  },
  {
    "name": "民生理财有限责任公司",
    "shortName": "民生理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.cmbc.com.cn",
    "status": true
  },
  {
    "name": "华夏理财有限责任公司",
    "shortName": "华夏理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.hxb.com.cn",
    "status": true
  },
  {
    "name": "平安理财有限责任公司",
    "shortName": "平安理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.bank.pingan.com",
    "status": true
  },
  {
    "name": "渤银理财有限责任公司",
    "shortName": "渤银理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.cbhb.com.cn",
    "status": true
  },
  {
    "name": "浙银理财有限责任公司",
    "shortName": "浙银理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.czbank.com",
    "status": true
  },
  {
    "name": "恒银理财有限责任公司",
    "shortName": "恒银理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.hengbank.com.cn",
    "status": true
  },
  {
    "name": "广银理财有限责任公司",
    "shortName": "广银理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.cgbchina.com.cn",
    "status": true
  },
  {
    "name": "杭银理财有限责任公司",
    "shortName": "杭银理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.bankofhz.com",
    "status": true
  },
  {
    "name": "宁银理财有限责任公司",
    "shortName": "宁银理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.nbcb.com.cn",
    "status": true
  },
  {
    "name": "徽银理财有限责任公司",
    "shortName": "徽银理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.hsbank.com.cn",
    "status": true
  },
  {
    "name": "南银理财有限责任公司",
    "shortName": "南银理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.njcb.com.cn",
    "status": true
  },
  {
    "name": "苏银理财有限责任公司",
    "shortName": "苏银理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.jsbchina.cn",
    "status": true
  },
  {
    "name": "青银理财有限责任公司",
    "shortName": "青银理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.qdccb.com",
    "status": true
  },
  {
    "name": "上银理财有限责任公司",
    "shortName": "上银理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.bosc.cn",
    "status": true
  },
  {
    "name": "北银理财有限责任公司",
    "shortName": "北银理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.bankofbeijing.com.cn",
    "status": true
  },
  {
    "name": "渝农商理财有限责任公司",
    "shortName": "渝农商理财",
    "companyType": "bank-subsidiary",
    "website": "https://www.cqrcb.com",
    "status": true
  },
  {
    "name": "高盛工银理财有限责任公司",
    "shortName": "高盛工银理财",
    "companyType": "joint-venture",
    "website": "",
    "status": true
  },
  {
    "name": "施罗德交银理财有限公司",
    "shortName": "施罗德交银理财",
    "companyType": "joint-venture",
    "website": "",
    "status": true
  },
  {
    "name": "贝莱德建信理财有限责任公司",
    "shortName": "贝莱德建信理财",
    "companyType": "joint-venture",
    "website": "",
    "status": true
  },
  {
    "name": "汇华理财有限公司",
    "shortName": "汇华理财",
    "companyType": "joint-venture",
    "website": "",
    "status": true
  },
  {
    "name": "法巴农银理财有限责任公司",
    "shortName": "法巴农银理财",
    "companyType": "joint-venture",
    "website": "",
    "status": true
  },
  {
    "name": "吉林银行股份有限公司",
    "shortName": "吉林银行",
    "companyType": "bank",
    "website": "https://www.jlbank.com.cn",
    "status": true
  }
]
```

**说明**：
- 6 国有大行：工银/建信/中银/农银/交银/中邮（companyType=bank-subsidiary）
- 12 股份行：招银/兴银/信银/光大/浦银/民生/华夏/平安/渤银/浙银/恒银/广银（companyType=bank-subsidiary）
- 8 城商行：杭银/宁银/徽银/南银/苏银/青银/上银/北银（companyType=bank-subsidiary）
- 1 农商行：渝农商（companyType=bank-subsidiary）
- 5 合资/外资：高盛工银/施罗德交银/贝莱德建信/汇华/法巴农银（companyType=joint-venture）
- 1 银行自营：吉林银行（companyType=bank）
- 合资公司官网无独立公开站点，留空字符串（website 非 required）

- [ ] **Step 2: 验证 JSON 格式正确**

用 `node -e "JSON.parse(require('fs').readFileSync('basic/plugins/zhao-wealth/server/src/data/wealth-companies.json','utf-8')); console.log('OK')"` 验证 JSON 合法，预期输出 OK。

确认数据条数：

```bash
node -e "const d=JSON.parse(require('fs').readFileSync('basic/plugins/zhao-wealth/server/src/data/wealth-companies.json','utf-8')); console.log('total:',d.length); const byType={}; d.forEach(x=>byType[x.companyType]=(byType[x.companyType]||0)+1); console.log(byType)"
```

预期输出：
```
total: 33
{ 'bank-subsidiary': 27, 'joint-venture': 5, bank: 1 }
```

---

## Task 3: 创建 Migration 脚本

**Files:**
- Create: `basic/plugins/zhao-wealth/server/database/migrations/003_seed_wealth_companies.js`

- [ ] **Step 1: 创建 003_seed_wealth_companies.js**

完整内容：

```javascript
'use strict';

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

async function up({ db }) {
  const dataPath = path.join(__dirname, '../../src/data/wealth-companies.json');
  const companies = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  let inserted = 0;
  let skipped = 0;

  for (const company of companies) {
    // 查重（按 name）
    const existing = await db('wealth_companies')
      .where({ name: company.name })
      .first();

    if (existing) {
      skipped++;
      continue;
    }

    // 插入（生成 document_id）
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
    inserted++;
  }

  console.log(`[zhao-wealth] 003_seed_wealth_companies: inserted=${inserted}, skipped=${skipped}`);
}

module.exports = { up };
```

**关键点**：
- 签名 `up({ db })` 解构参数（project_memory 强约束）
- 用 `crypto.randomUUID()` 生成 document_id（Node 内置无依赖）
- 字段名 snake_case：`short_name` / `company_type` / `created_at` / `updated_at`
- 按 name 查重，存在跳过，幂等
- 数据文件路径 `path.join(__dirname, '../../src/data/wealth-companies.json')`（migrations 目录 → src/data）
- 输出 inserted/skipped 计数便于排查

- [ ] **Step 2: 验证脚本语法**

用 `node --check basic/plugins/zhao-wealth/server/database/migrations/003_seed_wealth_companies.js` 验证语法正确。

---

## Task 4: 启动验证 + Schema 重建

**Files:**
- 无文件改动，仅运行验证

- [ ] **Step 1: 启动 Strapi**

```bash
cd e:\code\basic
npm run develop
```

- [ ] **Step 2: 验证 migration 执行**

启动日志中应出现：
```
[zhao-wealth] 003_seed_wealth_companies: inserted=33, skipped=0
```

若 skipped>0 说明已有同名数据（重跑场景），inserted+skipped 应等于 33。

- [ ] **Step 3: 验证 schema 重建**

若启动报错"enumeration value joint-venture not allowed"或 admin 显示旧枚举，需删除 schema 元数据：

```bash
psql -U postgres -d strapi -c "DELETE FROM strapi_database_schema WHERE uid = 'plugin::zhao-wealth.wealth-company';"
```

然后重启 Strapi 触发重建。

- [ ] **Step 4: 验证数据条数**

```bash
psql -U postgres -d strapi -c "SELECT COUNT(*) FROM wealth_companies;"
```

预期返回 33。

- [ ] **Step 5: 验证 companyType 分布**

```bash
psql -U postgres -d strapi -c "SELECT company_type, COUNT(*) FROM wealth_companies GROUP BY company_type ORDER BY company_type;"
```

预期：
```
 bank               |     1
 bank-subsidiary    |    27
 joint-venture      |     5
```

- [ ] **Step 6: 验证 admin 页面**

进入 Strapi admin → 理财基金管理 → 产品管理 → 理财公司 Tab，预期看到 33 条记录，含吉林银行（bank 类型）和 5 家合资公司（joint-venture 类型）。

- [ ] **Step 7: 幂等验证**

重启 Strapi，预期日志：
```
[zhao-wealth] 003_seed_wealth_companies: inserted=0, skipped=33
```

数据条数仍为 33，无重复。

---

## Task 5: git 提交

**Files:**
- 3 个文件改动（1 改 + 2 新增）

- [ ] **Step 1: git 提交**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/server/src/content-types/wealth-company/schema.json plugins/zhao-wealth/server/src/data/wealth-companies.json plugins/zhao-wealth/server/database/migrations/003_seed_wealth_companies.js
git commit -m "feat(wealth): 导入33条理财机构数据 - 32家理财子公司+吉林银行

- schema: companyType 新增 joint-venture 枚举值
- data: 新增 wealth-companies.json 静态数据文件（33条）
- migration: 003 脚本幂等插入，按 name 查重
- 数据构成: 6国有+12股份+8城商+1农商+5合资+1银行自营"
```

---

## Self-Review

### 1. Spec 覆盖检查

| Spec 要求 | 对应 Task |
|----------|----------|
| companyType 加 joint-venture 枚举 | Task 1 |
| 创建 33 条数据文件 | Task 2 |
| Migration 脚本幂等插入 | Task 3 |
| document_id 生成 | Task 3 |
| 启动验证 migration 执行 | Task 4 |
| Schema 重建 | Task 4 |
| 数据条数验证（33） | Task 4 |
| companyType 分布验证 | Task 4 |
| 幂等验证 | Task 4 |

### 2. 占位符扫描

- 无 TBD/TODO
- 33 条数据完整列出，无占位
- Migration 脚本完整可运行

### 3. 类型/命名一致性

- `companyType` 枚举值 `bank-subsidiary` / `joint-venture` / `bank` 与 schema 一致
- 表名 `wealth_companies`（snake_case 复数）与 schema.json `collectionName` 一致
- 字段名 `short_name` / `company_type` / `created_at` / `updated_at` snake_case 与 Strapi v5 约定一致
- `document_id` 字段名与 Strapi v5 一致

### 4. 数据条数验证

- 6 + 12 + 8 + 1 + 5 + 1 = 33 ✓
- bank-subsidiary: 6 + 12 + 8 + 1 = 27 ✓
- joint-venture: 5 ✓
- bank: 1 ✓

### 5. 风险确认

- website 部分留空：spec 已允许，非 required 字段
- 合资公司名称基于公开信息，可能存在工商注册名差异（如"汇华理财"实际名称可能是"汇华理财有限公司"）
- Migration 路径 `../../src/data/` 从 migrations 目录回溯两级到 server 目录，再进入 src/data，正确
