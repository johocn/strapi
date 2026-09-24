# GEO 发布达标门禁与知识实体页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 12 条 GEO 整改标准固化为执行机制：发布门禁、审核自检 API、知识实体页，并补齐手册门禁章节。

**Architecture:** 后端在 `zhao-website` 插件新增纯函数审计模块（`geo-article-audit`，无 strapi 依赖可单测）+ lifecycle 发布拦截 + admin-api 自检端点；知识图谱 service 扩展"实体→关联文章"查询供实体页消费。前端新增 `/knowledge/[slug]` 静态导出页，复用 (default)/[locale] 路由组策略。

**Tech Stack:** Strapi v5 插件（zhao-website）、Node 22（node:test 单测 + esbuild 编译）、Next.js App Router + 静态导出、纯 CSS。

---

## 文件结构

| 文件 | 责任 |
|---|---|
| `basic/plugins/zhao-website/server/src/services/utils/geo-article-audit.ts` | 新建：纯函数审计（12 条标准的 8 组校验） |
| `basic/plugins/zhao-website/server/src/services/utils/geo-district-words.ts` | 新建：省市区县词典 + 命中函数 |
| `basic/plugins/zhao-website/server/src/services/utils/geo-article-audit.test.cjs` | 新建：node:test 单测（require esbuild 编译产物） |
| `basic/plugins/zhao-website/server/src/content-types/geo-article/lifecycles.ts` | 新建：beforeUpdate 拦截 status→published |
| `basic/plugins/zhao-website/server/src/controllers/admin-api/geo-article-audit.ts` | 新建：audit-check 控制器 |
| `basic/plugins/zhao-website/server/src/routes/admin-api.ts` | 修改：注册 audit-check 路由 |
| `basic/plugins/zhao-website/server/src/services/knowledge-graph.ts` | 修改：`exportEntity` 返回关联文章 |
| `strapi-site/lib/knowledge-entity.ts` | 新建：实体数据获取 + slug 枚举 |
| `strapi-site/components/views/KnowledgeEntityView.tsx` | 新建：实体页视图 |
| `strapi-site/app/(default)/knowledge/[slug]/page.tsx` | 新建：默认语言路由 |
| `strapi-site/app/[locale]/knowledge/[slug]/page.tsx` | 新建：备选语言路由 |
| `strapi-site/app/globals.css` | 修改：实体页样式 |
| `docs/GEO文章写作手册.md` | 修改：A1 门禁章节 + A2 映射表 + A3 细节 |

**部署铁律（项目记忆）**：插件 `server/src` 改动必须在 `plugins/zhao-website/` 下 `npm run build` 重建 dist 并随 git 提交；验证用本机 curl（`/api/zhao-website/v1/...` 前缀）。

---

## Task 1: 手册补充（A1 门禁章节 + A2 映射表 + A3 细节）

**Files:**
- Modify: `docs/GEO文章写作手册.md`

- [ ] **Step 1: 在第 20 章补 jsonLdType 映射表（A2）**

在 `## 20. SEO 与多语言` 的 20.4 小节后插入：

```markdown
**文章类型 ↔ jsonLdType 映射表（发布必配）**

| 文章类型 | 推荐 jsonLdType |
|---|---|
| geo-faq | FAQPage |
| local-list | ItemList |
| local-comparison | ItemList |
| local-report | Article（站点配置本地地址时可 LocalBusiness） |
| geo-article | Article |

规则：显式配置优先；未配置时前端按上表推导（geo-faq→FAQPage，其余 Article）。
```

- [ ] **Step 2: 第 5 章对比表补"打分带依据"细节（A3）**

在 `## 5. 对比表` 的 5.4 中补充：

```markdown
- 维度 3-6 个；**每个分数必须带 note 依据**（一句话说明打分理由），禁止裸分。
```

- [ ] **Step 3: 第 6 章清单补"四项必填"细节（A3）**

在 `## 6. 本地清单` 的 6.4 中补充：

```markdown
- 每项必须完整填写：名称 + 描述 + 价格 + 跳转链接；缺失任一视为条目不达标。
```

- [ ] **Step 4: 新增第 25 章「上线达标门禁」（A1）**

文件末尾追加：

```markdown
## 25. 上线达标门禁（发布前必过清单）

### 25.1 设计目的
把全手册核心标准压缩为"发布门禁"：status 转 published 时由系统自动校验，未达标禁止发布。

### 25.2 门禁校验组（对应前文各章）
| 组 | 校验项 | 对应章节 |
|---|---|---|
| 1 选型 | geo-faq 必须有 faqQuestion；local-comparison 必须有 comparisonData；local-list 必须有 listItems | 第 1/5/6 章 |
| 2 标题 | 标题必须含本地地域词（省/市/区县词典） | 第 2 章 |
| 3 核心模块 | summaryPoints、localTips、infoBoundary 三项必填 | 第 9/10 章 |
| 4 E-E-A-T | 来源引用（sourceName/sourceUrl）、真值声明≥1、实体≥1、作者档案或 authorName | 第 7/11/12/14 章 |
| 5 结构化 | jsonLdType 与文章类型匹配；local-report 必须配置 businessData | 第 18/20 章 |
| 6 转化 | ctaType 或 leadFormEnabled 至少一项（报告/评测/清单类） | 第 15/16 章 |
| 7 合规 | riskType≠none；正文含金融/健康/法律关键词须选对应类型（告警） | 第 4 章 |
| 8 审核 | reviewChecks 四类全勾 + reviewerName + reviewedAt | 第 21 章 |

### 25.3 逃生口
admin 用户可 `?force=true` 跳过门禁（留痕），非 admin 一律阻断。

### 25.4 自检
发布前可在后台调用"审核自检"接口，返回逐项达标/缺漏报告，不阻断。
```

- [ ] **Step 5: Commit**

```bash
git add docs/GEO文章写作手册.md
git commit -m "docs: 手册补门禁章节、jsonLdType 映射、对比/清单细节"
```

---

## Task 2: 地区词典 + 审计纯函数（带单测）

**Files:**
- Create: `basic/plugins/zhao-website/server/src/services/utils/geo-district-words.ts`
- Create: `basic/plugins/zhao-website/server/src/services/utils/geo-article-audit.ts`
- Create: `basic/plugins/zhao-website/server/src/services/utils/geo-article-audit.test.cjs`

- [ ] **Step 1: 创建地区词典**

`basic/plugins/zhao-website/server/src/services/utils/geo-district-words.ts`:

```ts
/** 本地化地域词典（省/市/区县，宽松匹配，用于标题地域校验） */
export const DISTRICT_WORDS = [
  // 吉林省
  "吉林", "长春", "松原", "四平", "辽源", "通化", "白山", "白城", "延边", "梅河", "公主岭",
  "珲春", "蛟河", "桦甸", "舒兰", "磐石", "永吉", "九台", "榆树", "德惠", "农安",
  // 长春市辖区
  "昌邑", "船营", "龙潭", "丰满", "宽城", "南关", "二道", "绿园", "双阳", "净月", "高新", "经开", "汽开",
];

/** 标题是否含地域词 */
export function containsDistrictWord(title: string, extraWords: string[] = []): boolean {
  const words = DISTRICT_WORDS.concat(extraWords);
  return words.some((w) => w.length > 0 && title.includes(w));
}
```

- [ ] **Step 2: 创建审计纯函数**

`basic/plugins/zhao-website/server/src/services/utils/geo-article-audit.ts`:

```ts
import { containsDistrictWord } from "./geo-district-words";

export type AuditLevel = "error" | "warning";

export type AuditCheck = {
  group: string;
  field: string;
  rule: string;
  level: AuditLevel;
  passed: boolean;
  hint?: string;
};

export type GeoAuditInput = {
  type?: string;
  title?: string;
  content?: string;
  faqQuestion?: string;
  comparisonData?: any[];
  listItems?: any[];
  summaryPoints?: string;
  localTips?: string;
  infoBoundary?: string;
  sourceName?: string;
  sourceUrl?: string;
  truthBasis?: any[];
  mentionedEntities?: any[];
  author?: any;
  authorName?: string;
  jsonLdType?: string;
  businessData?: any[];
  ctaType?: string;
  leadFormEnabled?: boolean;
  riskType?: string;
  reviewChecks?: Record<string, boolean>;
  reviewerName?: string;
  reviewedAt?: string;
  cityWords?: string[];
};

/** 文章类型 → 允许的 jsonLdType（对应手册第 20 章映射表） */
const JSONLD_EXPECTED: Record<string, string[]> = {
  "geo-faq": ["FAQPage"],
  "local-list": ["ItemList"],
  "local-comparison": ["ItemList"],
  "local-report": ["Article", "LocalBusiness"],
  "geo-article": ["Article"],
};

const RISK_KEYWORDS: Record<string, string[]> = {
  finance: ["股票", "基金", "理财", "投资", "收益", "保险", "期货", "外汇", "债券", "信托", "证券", "A股", "港股", "美股"],
  health: ["手术", "医院", "医生", "药品", "治疗", "就诊", "体检", "激光", "近视"],
  legal: ["律师", "合同", "诉讼", "起诉", "法律", "法院", "劳动仲裁"],
};

const TYPE_SPECIFIC_FIELD: Record<string, string> = {
  "geo-faq": "faqQuestion",
  "local-comparison": "comparisonData",
  "local-list": "listItems",
};

function hasNonEmptyArray(v: any[] | undefined | null): boolean {
  return Array.isArray(v) && v.length > 0;
}

/** 12 条整改标准 → 8 组校验（纯函数，无 strapi 依赖） */
export function auditGeoArticle(article: GeoAuditInput): { pass: boolean; missing: AuditCheck[] } {
  const missing: AuditCheck[] = [];
  const type = article.type || "geo-article";

  const push = (check: AuditCheck) => missing.push(check);

  // 1 选型
  const specField = TYPE_SPECIFIC_FIELD[type];
  if (specField) {
    const v = article[specField as keyof GeoAuditInput];
    const ok = specField === "faqQuestion" ? !!v : hasNonEmptyArray(v as any[]);
    push({
      group: "选型", field: specField, level: "error", passed: ok,
      rule: `${type} 必须填写 ${specField}`,
      hint: ok ? undefined : `补填 ${specField}`,
    });
  }

  // 2 标题地域词
  const titleOk = !!article.title && containsDistrictWord(article.title, article.cityWords);
  push({
    group: "标题", field: "title", level: "error", passed: titleOk,
    rule: "标题必须含本地地域词（省/市/区县）",
    hint: titleOk ? undefined : "标题加入地域词，如：吉林市/船营区",
  });

  // 3 核心三模块
  for (const field of ["summaryPoints", "localTips", "infoBoundary"] as const) {
    const ok = !!(article[field] && String(article[field]).trim());
    push({
      group: "核心模块", field, level: "error", passed: ok,
      rule: `${field} 必填`,
      hint: ok ? undefined : `补填 ${field}`,
    });
  }

  // 4 E-E-A-T 证据链
  const sourceOk = !!(article.sourceName || article.sourceUrl);
  push({
    group: "E-E-A-T", field: "sourceName/sourceUrl", level: "error", passed: sourceOk,
    rule: "关键数据必须挂载权威信源",
    hint: sourceOk ? undefined : "填 sourceName 或 sourceUrl",
  });
  const truthOk = hasNonEmptyArray(article.truthBasis);
  push({
    group: "E-E-A-T", field: "truthBasis", level: "error", passed: truthOk,
    rule: "关联至少 1 条真值声明",
    hint: truthOk ? undefined : "关联真值声明（先建后选）",
  });
  const entityOk = hasNonEmptyArray(article.mentionedEntities);
  push({
    group: "E-E-A-T", field: "mentionedEntities", level: "error", passed: entityOk,
    rule: "关联至少 1 个知识实体",
    hint: entityOk ? undefined : "关联知识实体",
  });
  const authorOk = !!(article.author || article.authorName);
  push({
    group: "E-E-A-T", field: "author/authorName", level: "error", passed: authorOk,
    rule: "配置作者档案或作者名",
    hint: authorOk ? undefined : "关联作者档案或填 authorName",
  });

  // 5 结构化数据
  const jsonldOk = JSONLD_EXPECTED[type]?.includes(article.jsonLdType || "Article") ?? true;
  push({
    group: "结构化", field: "jsonLdType", level: "error", passed: jsonldOk,
    rule: `jsonLdType 必须与文章类型匹配（${(JSONLD_EXPECTED[type] || []).join("/")}）`,
    hint: jsonldOk ? undefined : `改为 ${(JSONLD_EXPECTED[type] || []).join(" 或 ")}`,
  });
  if (type === "local-report") {
    const bizOk = hasNonEmptyArray(article.businessData);
    push({
      group: "结构化", field: "businessData", level: "error", passed: bizOk,
      rule: "报告类必须配置 businessData（period/content/caliber）",
      hint: bizOk ? undefined : "补填 businessData",
    });
  }

  // 6 转化（warning）
  const ctaOk = (article.ctaType && article.ctaType !== "none") || article.leadFormEnabled === true;
  push({
    group: "转化", field: "ctaType/leadFormEnabled", level: "warning", passed: ctaOk,
    rule: "报告/评测/清单类建议配置 CTA 或留资表单",
    hint: ctaOk ? undefined : "配置 ctaType 或开启 leadFormEnabled",
  });

  // 7 合规
  const riskOk = !!article.riskType && article.riskType !== "none";
  push({
    group: "合规", field: "riskType", level: "error", passed: riskOk,
    rule: "riskType 必填且非 none",
    hint: riskOk ? undefined : "选择对应风险类型",
  });
  const contentText = String(article.content || "");
  for (const [cat, words] of Object.entries(RISK_KEYWORDS)) {
    const hit = words.some((w) => contentText.includes(w));
    const covered =
      cat === "finance" ? (article.riskType || "").startsWith("finance-") : article.riskType === cat;
    if (hit && !covered) {
      push({
        group: "合规", field: "riskType", level: "warning", passed: false,
        rule: `正文疑似 ${cat} 内容，风险类型未覆盖`,
        hint: `选择 ${cat === "finance" ? "finance-* 细分" : cat} 风险类型`,
      });
    }
  }

  // 8 审核
  const checks = article.reviewChecks || {};
  const checksOk = !!checks.eaat && !!checks.tech && !!checks.compliance && !!checks.business;
  push({
    group: "审核", field: "reviewChecks", level: "error", passed: checksOk,
    rule: "reviewChecks 四类全勾（eaat/tech/compliance/business）",
    hint: checksOk ? undefined : "四类自查全勾选",
  });
  push({
    group: "审核", field: "reviewerName", level: "error", passed: !!article.reviewerName,
    rule: "审核人必填", hint: article.reviewerName ? undefined : "填 reviewerName",
  });
  push({
    group: "审核", field: "reviewedAt", level: "error", passed: !!article.reviewedAt,
    rule: "审核日期必填", hint: article.reviewedAt ? undefined : "填 reviewedAt",
  });

  const pass = missing.every((m) => m.passed);
  return { pass, missing };
}
```

- [ ] **Step 3: 写单测（node:test + esbuild 编译，零新依赖）**

`basic/plugins/zhao-website/server/src/services/utils/geo-article-audit.test.cjs`:

```js
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { auditGeoArticle } = require("./.build/geo-article-audit.cjs");

const PASSING = {
  type: "local-report",
  title: "吉林市近视手术医院怎么选",
  content: "本报告基于官方公开数据，请理性看待手术风险",
  faqQuestion: "",
  summaryPoints: "1. 公立私立均可做",
  localTips: "建议预约工作日上午",
  infoBoundary: "数据基于公开信息整理",
  sourceName: "吉林省卫健委",
  sourceUrl: "https://example.gov.cn",
  truthBasis: [{ claim: "数据以官方为准" }],
  mentionedEntities: [{ name: "XX眼科" }],
  authorName: "张医生",
  jsonLdType: "Article",
  businessData: [{ period: "2026年1-6月", content: "1200 台", caliber: "卫健委口径" }],
  ctaType: "consult-appointment",
  riskType: "health",
  reviewChecks: { eaat: true, tech: true, compliance: true, business: true },
  reviewerName: "李审核",
  reviewedAt: "2026-07-02",
};

test("达标文章 pass=true 且无缺漏", () => {
  const r = auditGeoArticle(PASSING);
  assert.equal(r.pass, true);
  assert.equal(r.missing.filter((m) => !m.passed).length, 0);
});

test("缺核心模块与 E-E-A-T 返回 error 缺漏", () => {
  const r = auditGeoArticle({ ...PASSING, summaryPoints: "", localTips: "", infoBoundary: "", truthBasis: [], mentionedEntities: [], sourceName: "", sourceUrl: "" });
  assert.equal(r.pass, false);
  const failed = r.missing.filter((m) => !m.passed);
  assert.ok(failed.some((m) => m.group === "核心模块"));
  assert.ok(failed.some((m) => m.group === "E-E-A-T"));
});

test("选型专属字段缺失被拦截", () => {
  const r = auditGeoArticle({ ...PASSING, type: "local-list", listItems: [] });
  assert.equal(r.pass, false);
  assert.ok(r.missing.some((m) => m.field === "listItems" && !m.passed));
});

test("jsonLdType 与类型不匹配被拦截", () => {
  const r = auditGeoArticle({ ...PASSING, type: "geo-faq", jsonLdType: "Article", faqQuestion: "吉林近视手术安全吗？" });
  assert.ok(r.missing.some((m) => m.field === "jsonLdType" && !m.passed));
});

test("标题无地域词被拦截", () => {
  const r = auditGeoArticle({ ...PASSING, title: "近视手术医院怎么选" });
  assert.ok(r.missing.some((m) => m.field === "title" && !m.passed));
});

test("正文金融关键词未覆盖风险类型 → warning", () => {
  const r = auditGeoArticle({ ...PASSING, content: "本产品预期收益率约 5%", riskType: "health" });
  assert.ok(r.missing.some((m) => m.group === "合规" && m.level === "warning" && !m.passed));
});
```

- [ ] **Step 4: esbuild 编译并跑测试**

Run（在 `basic/plugins/zhao-website` 目录）:

```bash
npx esbuild server/src/services/utils/geo-article-audit.ts --bundle --format=cjs --platform=node --outfile=server/src/services/utils/.build/geo-article-audit.cjs
node --test server/src/services/utils/geo-article-audit.test.cjs
```

Expected: `# pass 6`、`# fail 0`。

- [ ] **Step 5: Commit**

```bash
git add basic/plugins/zhao-website/server/src/services/utils/geo-district-words.ts basic/plugins/zhao-website/server/src/services/utils/geo-article-audit.ts basic/plugins/zhao-website/server/src/services/utils/geo-article-audit.test.cjs
git commit -m "feat(geo): 发布审计纯函数与地区词典（含单测）"
```

---

## Task 3: 发布门禁 lifecycle（beforeUpdate 拦截）

**Files:**
- Create: `basic/plugins/zhao-website/server/src/content-types/geo-article/lifecycles.ts`

- [ ] **Step 1: 创建 lifecycle**

参照现有先例 `content-types/article/lifecycles.ts` 的导出结构。`basic/plugins/zhao-website/server/src/content-types/geo-article/lifecycles.ts`:

```ts
import type { Core } from "@strapi/strapi";
import { errors } from "@strapi/utils";
import { auditGeoArticle } from "../../services/utils/geo-article-audit";

const UID = "plugin::zhao-website.geo-article";
const ApplicationError = errors.ApplicationError;

const POPULATE = ["truthBasis", "mentionedEntities", "author"];

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async beforeUpdate(event: any) {
    const { data, where } = event.params;
    // 仅在"转为 published"时校验；已发布文章再次保存不拦截
    if (!data || data.status !== "published") return;
    const existing = await strapi.db.query(UID).findOne({ where, populate: POPULATE });
    if (!existing || existing.status === "published") return;

    const merged = { ...existing, ...data };
    const audit = auditGeoArticle({
      type: merged.type,
      title: merged.title,
      content: merged.content,
      faqQuestion: merged.faqQuestion,
      comparisonData: merged.comparisonData,
      listItems: merged.listItems,
      summaryPoints: merged.summaryPoints,
      localTips: merged.localTips,
      infoBoundary: merged.infoBoundary,
      sourceName: merged.sourceName,
      sourceUrl: merged.sourceUrl,
      truthBasis: merged.truthBasis,
      mentionedEntities: merged.mentionedEntities,
      author: merged.author,
      authorName: merged.authorName,
      jsonLdType: merged.jsonLdType,
      businessData: merged.businessData,
      ctaType: merged.ctaType,
      leadFormEnabled: merged.leadFormEnabled,
      riskType: merged.riskType,
      reviewChecks: merged.reviewChecks,
      reviewerName: merged.reviewerName,
      reviewedAt: merged.reviewedAt,
    });

    if (!audit.pass) {
      throw new ApplicationError("发布未达标：请补齐以下缺漏项", {
        code: "GEO_AUDIT_FAIL",
        missing: audit.missing.filter((m) => !m.passed),
      });
    }
  },
});
```

- [ ] **Step 2: 重建插件 dist（部署铁律）**

Run:

```bash
npm run build
```

Expected: `plugins/zhao-website/dist` 重新生成，`dist/server/src/content-types/geo-article/lifecycles.js` 存在且包含 `GEO_AUDIT_FAIL` 关键字（用 `rg "GEO_AUDIT_FAIL" dist` 验证）。

- [ ] **Step 3: Commit（含 dist）**

```bash
git add basic/plugins/zhao-website
git commit -m "feat(geo): 发布门禁 lifecycle 拦截未达标转 published"
```

---

## Task 4: 审核自检 API（admin-api）

**Files:**
- Create: `basic/plugins/zhao-website/server/src/controllers/admin-api/geo-article-audit.ts`
- Modify: `basic/plugins/zhao-website/server/src/routes/admin-api.ts`

- [ ] **Step 1: 创建控制器**

`basic/plugins/zhao-website/server/src/controllers/admin-api/geo-article-audit.ts`:

```ts
import { auditGeoArticle } from "../../services/utils/geo-article-audit";

const UID = "plugin::zhao-website.geo-article";
const POPULATE = ["truthBasis", "mentionedEntities", "author"];

export default {
  async check(ctx: any) {
    const { documentId } = ctx.params;
    const siteId = ctx.state.siteId;
    const doc = await strapi.db.query(UID).findOne({
      where: { documentId, site: siteId, deletedAt: null },
      populate: POPULATE,
    });
    if (!doc) return ctx.notFound("GeoArticle not found");

    const audit = auditGeoArticle({
      type: doc.type,
      title: doc.title,
      content: doc.content,
      faqQuestion: doc.faqQuestion,
      comparisonData: doc.comparisonData,
      listItems: doc.listItems,
      summaryPoints: doc.summaryPoints,
      localTips: doc.localTips,
      infoBoundary: doc.infoBoundary,
      sourceName: doc.sourceName,
      sourceUrl: doc.sourceUrl,
      truthBasis: doc.truthBasis,
      mentionedEntities: doc.mentionedEntities,
      author: doc.author,
      authorName: doc.authorName,
      jsonLdType: doc.jsonLdType,
      businessData: doc.businessData,
      ctaType: doc.ctaType,
      leadFormEnabled: doc.leadFormEnabled,
      riskType: doc.riskType,
      reviewChecks: doc.reviewChecks,
      reviewerName: doc.reviewerName,
      reviewedAt: doc.reviewedAt,
    });

    const total = audit.missing.length;
    const passedCount = audit.missing.filter((m) => m.passed).length;
    ctx.body = {
      documentId,
      status: doc.status,
      pass: audit.pass,
      score: total === 0 ? 1 : Math.round((passedCount / total) * 100) / 100,
      checks: audit.missing,
    };
  },
};
```

- [ ] **Step 2: 注册路由**

`basic/plugins/zhao-website/server/src/routes/admin-api.ts` 的 routes 数组末尾（`/stats/search` 行后）追加：

```ts
channelScopeRoute("POST", "/geo-articles/:documentId/audit-check", "geo-article-audit.check", "article.read"),
```

- [ ] **Step 3: 重建 dist + 提交**

Run:

```bash
npm run build
rg "audit-check" dist/server/src/routes/admin-api.js
```

Expected: 命中 `geo-articles/:documentId/audit-check`。

```bash
git add basic/plugins/zhao-website
git commit -m "feat(geo): 审核自检 API audit-check"
```

---

## Task 5: 知识图谱 exportEntity 返回关联文章

**Files:**
- Modify: `basic/plugins/zhao-website/server/src/services/knowledge-graph.ts`

- [ ] **Step 1: 新增 findArticlesByEntity 并挂入 exportEntity**

在 `exportEntity` 方法内、`return this._entityToJsonLd(...)` 前插入关联文章查询；同时把 `_entityToJsonLd` 返回对象展开并追加 `articles`。修改后 `exportEntity` 与新增私有方法：

```ts
  async exportEntity(siteId: number, slug: string): Promise<any | null> {
    const entity = await this.findEntityBySlug(siteId, slug);
    if (!entity) return null;
    const outgoing = await strapi.db.query(RELATION_UID).findMany({
      where: { $or: [{ site: siteId, subjectEntity: entity.documentId, deletedAt: null }, { site: null, subjectEntity: entity.documentId, deletedAt: null }] },
      populate: ["objectEntity"],
    });
    const incoming = await strapi.db.query(RELATION_UID).findMany({
      where: { $or: [{ site: siteId, objectEntity: entity.documentId, deletedAt: null }, { site: null, objectEntity: entity.documentId, deletedAt: null }] },
      populate: ["subjectEntity"],
    });
    const articles = await this.findArticlesByEntity(siteId, entity.documentId);
    return { ...this._entityToJsonLd(entity, outgoing, incoming), articles };
  },

  /** 实体 → 提及该实体的已发布 GEO 文章 */
  async findArticlesByEntity(siteId: number, entityDocumentId: string, limit = 20): Promise<any[]> {
    return strapi.db.query("plugin::zhao-website.geo-article").findMany({
      where: { site: siteId, status: "published", deletedAt: null, mentionedEntities: entityDocumentId },
      select: ["slug", "title", "type", "publishedAt"],
      limit,
    });
  },
```

- [ ] **Step 2: 重建 dist + 提交**

Run:

```bash
npm run build
rg "findArticlesByEntity" dist/server/src/services/knowledge-graph.js
git add basic/plugins/zhao-website
git commit -m "feat(geo): 实体导出附带关联文章"
```

---

## Task 6: 前端知识实体页（静态导出）

**Files:**
- Create: `strapi-site/lib/knowledge-entity.ts`
- Create: `strapi-site/components/views/KnowledgeEntityView.tsx`
- Create: `strapi-site/app/(default)/knowledge/[slug]/page.tsx`
- Create: `strapi-site/app/[locale]/knowledge/[slug]/page.tsx`
- Modify: `strapi-site/app/globals.css`

- [ ] **Step 1: 数据层**

`strapi-site/lib/knowledge-entity.ts`:

```ts
import { API_ROOT } from "@/lib/env";

export type EntityRelation = {
  predicate: string;
  objectEntity?: { slug?: string; name?: string; "@id"?: string };
  objectValue?: unknown;
  objectText?: string;
  sourceType?: string;
};

export type KnowledgeEntity = {
  "@type"?: string;
  "@id"?: string;
  name: string;
  description?: string;
  url?: string;
  image?: string;
  slug?: string;
  verificationStatus?: string;
  confidence?: number;
  sameAs?: string[];
  articles?: { slug: string; title: string; type: string; publishedAt?: string }[];
  incoming?: any[];
  outgoing?: EntityRelation[];
  [key: string]: unknown;
};

/** 实体详情（content-api /knowledge-graph/:slug） */
export async function getKnowledgeEntity(slug: string): Promise<{ status: number; entity: KnowledgeEntity | null }> {
  try {
    const res = await fetch(`${API_ROOT}/knowledge-graph/${encodeURIComponent(slug)}`);
    if (!res.ok) return { status: res.status, entity: null };
    return { status: res.status, entity: await res.json() };
  } catch {
    return { status: 500, entity: null };
  }
}

/** 构建期枚举全部实体 slug（knowledge-graph.json @graph 的 @id 即 slug） */
export async function listKnowledgeEntitySlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${API_ROOT}/knowledge-graph.json`);
    if (!res.ok) return [];
    const data = await res.json();
    const graph = Array.isArray(data) ? data : data?.["@graph"];
    if (!Array.isArray(graph)) return [];
    return graph
      .map((n: any) => (typeof n?.["@id"] === "string" ? n["@id"] : n?.slug))
      .filter((s: unknown): s is string => typeof s === "string" && s.length > 0);
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: 实体页视图**

`strapi-site/components/views/KnowledgeEntityView.tsx`:

```tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getKnowledgeEntity, type KnowledgeEntity } from "@/lib/knowledge-entity";
import { localizedPath } from "@/lib/i18n";
import type { GeoArticleType } from "@/lib/geo-article";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const TYPE_LABELS: Record<string, string> = {
  Organization: "机构", Person: "人物", Product: "产品", Service: "服务",
  Place: "地点", Event: "事件", Brand: "品牌",
};

const ROUTE_PREFIX: Record<string, string> = {
  "geo-article": "/geo-article", "geo-faq": "/geo-faq",
  "local-report": "/local-report", "local-comparison": "/local-comparison", "local-list": "/local-list",
};

function relationItems(entity: KnowledgeEntity): { label: string; value: string; href?: string }[] {
  const items: { label: string; value: string; href?: string }[] = [];
  const outgoing = Array.isArray(entity.outgoing) ? entity.outgoing : [];
  for (const rel of outgoing) {
    if (rel.objectEntity?.name) {
      const href = rel.objectEntity.slug ? `/knowledge/${rel.objectEntity.slug}` : undefined;
      items.push({ label: rel.predicate, value: rel.objectEntity.name, href });
    } else if (rel.objectText) {
      items.push({ label: rel.predicate, value: rel.objectText });
    } else if (rel.objectValue !== undefined && rel.objectValue !== null) {
      items.push({ label: rel.predicate, value: String(rel.objectValue) });
    }
  }
  return items;
}

export async function generateEntityMetadata(slug: string): Promise<Metadata> {
  const { status, entity } = await getKnowledgeEntity(slug);
  if (status === 404 || !entity) return {};
  return {
    title: `${entity.name} - ${TYPE_LABELS[String(entity["@type"] || "")] || "知识实体"}`,
    description: entity.description || undefined,
  };
}

export async function KnowledgeEntityView({ slug, locale }: { slug: string; locale: string }) {
  const { status, entity } = await getKnowledgeEntity(slug);
  if (status === 404 || !entity) notFound();

  const relations = relationItems(entity);
  const articles = Array.isArray(entity.articles) ? entity.articles : [];

  return (
    <div className="entity-page">
      <header className="entity-header">
        <span className="entity-type">{TYPE_LABELS[String(entity["@type"] || "")] || String(entity["@type"] || "实体")}</span>
        <h1>{entity.name}</h1>
        {entity.description ? <p>{entity.description}</p> : null}
        {(entity.verificationStatus || entity.confidence !== undefined) ? (
          <p className="entity-meta">
            核验：{entity.verificationStatus || "unknown"}
            {entity.confidence !== undefined ? ` · 置信度 ${entity.confidence}` : ""}
          </p>
        ) : null}
      </header>

      {relations.length > 0 ? (
        <section className="entity-section">
          <h2>知识关系</h2>
          <ul className="entity-relations">
            {relations.map((r, i) => (
              <li key={i}>
                <span className="rel-predicate">{r.label}</span>
                {r.href ? <a href={localizedPath(locale, r.href)}>{r.value}</a> : <span>{r.value}</span>}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {articles.length > 0 ? (
        <section className="entity-section">
          <h2>相关文章</h2>
          <ul className="entity-articles">
            {articles.map((a) => (
              <li key={a.slug}>
                <a href={localizedPath(locale, `${ROUTE_PREFIX[a.type as GeoArticleType] || "/geo-article"}/${a.slug}`)}>{a.title}</a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: 路由（默认语言 + 备选语言）**

`strapi-site/app/[locale]/knowledge/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { KnowledgeEntityView, generateEntityMetadata } from "@/components/views/KnowledgeEntityView";
import { normalizeLocale, DEFAULT_LOCALE, alternateLocaleSegments } from "@/lib/i18n";
import { listKnowledgeEntitySlugs } from "@/lib/knowledge-entity";

export async function generateStaticParams() {
  const slugs = await listKnowledgeEntitySlugs();
  const params: { locale: string; slug: string }[] = [];
  for (const { locale } of alternateLocaleSegments()) {
    if (slugs.length === 0) {
      params.push({ locale, slug: "__missing__" });
      continue;
    }
    for (const slug of slugs) params.push({ locale, slug });
  }
  return params;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = normalizeLocale(rawLocale) ?? DEFAULT_LOCALE;
  void locale;
  return generateEntityMetadata(slug);
}

export default async function KnowledgeEntityPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: rawLocale, slug } = await params;
  const locale = normalizeLocale(rawLocale) ?? DEFAULT_LOCALE;
  return <KnowledgeEntityView slug={slug} locale={locale} />;
}
```

`strapi-site/app/(default)/knowledge/[slug]/page.tsx`:

```tsx
// 默认语言（zh-CN）知识实体：根路径 /knowledge/[slug]，复用 [locale] 页面
export { default, generateMetadata } from "../../../[locale]/knowledge/[slug]/page";

import { listKnowledgeEntitySlugs } from "@/lib/knowledge-entity";

export async function generateStaticParams() {
  const slugs = await listKnowledgeEntitySlugs();
  return slugs.length > 0 ? slugs.map((slug) => ({ slug })) : [{ slug: "__missing__" }];
}
```

> 注：(default) 路由 `export { default } from ...` 与本地 `generateStaticParams` 导出共存（与 `app/(default)/local-report/[slug]/page.tsx` 模式一致）。

- [ ] **Step 4: 样式**

`strapi-site/app/globals.css` 末尾追加：

```css
/* ===== 知识实体页 ===== */
.entity-page { max-width: 760px; margin: 0 auto; padding: 32px 20px 64px; }
.entity-header { border-bottom: 1px solid var(--border, #e5e7eb); padding-bottom: 20px; margin-bottom: 24px; }
.entity-type { display: inline-block; font-size: 12px; color: var(--brand, #4f46e5); background: rgba(79, 70, 229, 0.08); border-radius: 999px; padding: 2px 10px; margin-bottom: 8px; }
.entity-header h1 { font-size: 26px; margin: 0 0 8px; }
.entity-header p { color: var(--text-muted, #6b7280); margin: 0 0 4px; }
.entity-meta { font-size: 12px; }
.entity-section { margin-bottom: 28px; }
.entity-section h2 { font-size: 18px; margin-bottom: 12px; }
.entity-relations, .entity-articles { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.entity-relations li, .entity-articles li { display: flex; gap: 10px; align-items: baseline; padding: 10px 14px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; }
.rel-predicate { flex: 0 0 auto; color: var(--brand, #4f46e5); font-size: 13px; }
.entity-articles a { color: inherit; text-decoration: none; }
.entity-articles a:hover { text-decoration: underline; }
```

- [ ] **Step 5: 构建验证**

Run（`strapi-site` 目录，指向生产数据源）:

```bash
$env:NEXT_PUBLIC_API_ORIGIN="https://www.joho.cn"; $env:NEXT_PUBLIC_SITE_URL="https://www.joho.cn"; npm run build
```

Expected: `out/knowledge/<slug>.html` 生成（无 slug 时 `out/knowledge/__missing__.html`）；无构建错误。

- [ ] **Step 6: Commit**

```bash
git add strapi-site
git commit -m "feat(site): 知识实体页 /knowledge/[slug] 静态导出"
```

---

## Self-Review（执行前核对）

- **Spec 覆盖**：A1（Task1 Step4）、A2（Task1 Step1）、A3（Task1 Step2/3）、B1 门禁（Task2+3）、B2 自检 API（Task4）、B3 实体页（Task5+6）——全覆盖。
- **类型一致性**：`auditGeoArticle` 输入字段名与 geo-article schema 一致（summaryPoints/localTips/infoBoundary/sourceName/sourceUrl/truthBasis/mentionedEntities/author/authorName/jsonLdType/businessData/ctaType/leadFormEnabled/riskType/reviewChecks/reviewerName/reviewedAt）。
- **部署铁律**：Task 3/4/5 均含 `npm run build` + dist 校验 + dist 随 commit。
- **风险应对**：已发布文章再保存不拦截（existing.status==="published" 早退）；无实体时前端生成 `__missing__` 占位路由避免静态导出失败。
