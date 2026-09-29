# 知识图谱 GEO / AI 可消费性治理 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让知识实体 / 关系 / 第一真值从"结构上存在"升级为 AI 可无歧义消费、可引用、可核验，并建立只读的缺口检测机制。

**Architecture:** 写入侧为谓词加「客体契约」并把文章的段落举证从「实体属性断言」改为「引用（`cites`）+ `evidenceText`」两个概念；出口侧做「读时隔离」（不修改存量数据，序列化前过滤违规关系）；数据补齐一律人工，脚本只检测不写。

**Tech Stack:** Strapi v5 插件（TypeScript）、Jest + ts-jest（手写 `createMockStrapi` mock，不启动真实实例）、Next.js 静态站（`strapi-site`，nginx 反代出口）。

**Spec:** `docs/superpowers/specs/2026-09-29-knowledge-geo-ai-readiness-design.md`

**约定**
- 所有命令的工作目录：`e:\code\basic\plugins\zhao-website`（除非显式说明）。
- 测试命令：`npm test -- <pattern>`（等价 `jest --config tests/jest.config.ts -- <pattern>`）。
- 提交只 add 本 Task 列出的文件，不使用 `git add -A`。
- **与 spec 的一处收窄**：spec 6.1 契约类型含 `allowedValueTypes`，但登记契约中无任何一项使用它。按「拒绝冗余」原则本计划不实现该字段，仅保留 `objectKinds` + `maxLength`。
- **P1 第 11 项（`DefinedTermSet`）** 按 spec「结构侧仅需保证 `inDefinedTermSet` 契约与字典就位」执行，由 Task 1 覆盖（字典已有 `DefinedTerm.inDefinedTermSet`，Task 1 补其契约与单测），不单列任务。

---

## 文件结构（分解锁定）

| 文件 | 职责 | 动作 |
|---|---|---|
| `server/src/services/utils/predicate-contracts.ts` | 客体契约表 + 校验函数（纯函数，无 IO） | 新建 |
| `server/src/services/utils/predicate-dictionary.ts` | 谓词字典；补 `Organization.url`、`Article.cites`、`CreativeWork.cites` | 修改 |
| `server/src/services/utils/claim-predicate-map.ts` | claimKey→谓词对照表；`brand_domain_*` 改 `url` | 修改 |
| `server/src/services/utils/kg-sync.ts` | 派生：段落举证改 `cites` + `evidenceText` | 修改 |
| `server/src/services/knowledge-graph.ts` | 写入契约拦截、读时隔离、`@id` 绝对化、`rejected` 过滤、可信度字段、`subjectOf`、cites 限流 | 修改 |
| `server/src/content-types/knowledge-relation/schema.json` | 新增 `evidenceText` | 修改 |
| `server/src/content-types/first-truth-policy/schema.json` | `claimCategory` 新增 `terminology_definition` | 修改 |
| `server/src/services/knowledge-health.ts` | 只读完备度/违规统计 | 新建 |
| `server/src/services/index.ts` | 注册 `knowledge-health` | 修改 |
| `server/src/controllers/admin-api/knowledge-health.ts` | admin 控制器 | 新建 |
| `server/src/controllers/index.ts` | 注册 admin 控制器 | 修改 |
| `server/src/routes/admin-api.ts` | admin 路由 | 修改 |
| `server/src/services/llms-txt.ts` | `llms.txt` 完善 + `generateFull`（`llms-full.txt`） | 修改 |
| `server/src/controllers/content-api/seo-output.ts` | `llmsFullTxt` 控制器 | 修改 |
| `server/src/routes/content-api.ts` | `llms-full.txt` 路由 | 修改 |
| `server/src/services/robots.ts` | 显式 AI UA 允许段 | 修改 |
| `server/src/services/sitemap.ts` | 首页 `lastmod` | 修改 |
| `admin/src/utils/api.ts` | 完备度接口常量 | 修改 |
| `admin/src/pages/KnowledgeGraphPage.tsx` | 「完备度」Tab 面板 | 修改 |
| `e:\code\strapi-site\nginx\www.joho.cn.conf` | `/llms-full.txt` 反代 location（另一仓库） | 修改 |

---

# P0 — 止血

## Task 1: 谓词客体契约表 + 校验函数 + 字典补齐

**Files:**
- Create: `server/src/services/utils/predicate-contracts.ts`
- Modify: `server/src/services/utils/predicate-dictionary.ts:3-29`
- Test: `tests/services/predicate-contracts.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `tests/services/predicate-contracts.test.ts`：

```ts
import {
  getPredicateContract,
  validateObjectContract,
} from "../../server/src/services/utils/predicate-contracts";
import { isValidPredicate } from "../../server/src/services/utils/predicate-dictionary";

describe("predicate-contracts 契约表", () => {
  test("已登记契约可取出", () => {
    expect(getPredicateContract("DefinedTerm", "termCode")).toEqual(
      expect.objectContaining({ objectKinds: ["value"], maxLength: 60 })
    );
    expect(getPredicateContract("Organization", "url")).not.toBeNull();
    expect(getPredicateContract("Article", "cites")).toEqual({ objectKinds: ["citation"] });
  });

  test("未登记契约返回 null", () => {
    expect(getPredicateContract("Organization", "mentions")).toBeNull();
    expect(getPredicateContract("Unknown", "url")).toBeNull();
  });
});

describe("validateObjectContract", () => {
  const shape = (o: Partial<{ hasEntity: boolean; hasValue: boolean; hasText: boolean; textLength: number }>) => ({
    hasEntity: false, hasValue: false, hasText: false, textLength: 0, ...o,
  });

  test("未登记契约 → 放行（返回 null）", () => {
    expect(validateObjectContract("Organization", "mentions", shape({ hasText: true, textLength: 999 }))).toBeNull();
  });

  test("value 契约：objectValue 通过", () => {
    expect(validateObjectContract("DefinedTerm", "termCode", shape({ hasValue: true }))).toBeNull();
  });

  test("value 契约：objectText 超长 → 拒绝并给出原因", () => {
    const reason = validateObjectContract("DefinedTerm", "termCode", shape({ hasText: true, textLength: 300 }));
    expect(reason).toContain("超出上限 60");
  });

  test("value 契约：objectText 未超长 → 通过", () => {
    expect(validateObjectContract("Organization", "slogan", shape({ hasText: true, textLength: 12 }))).toBeNull();
  });

  test("value 契约：给 objectEntity  → 拒绝", () => {
    expect(validateObjectContract("DefinedTerm", "termCode", shape({ hasEntity: true }))).toContain("客体形态");
  });

  test("entity 契约：必须给 objectEntity", () => {
    expect(validateObjectContract("DefinedTerm", "inDefinedTermSet", shape({ hasEntity: true }))).toBeNull();
    expect(validateObjectContract("DefinedTerm", "inDefinedTermSet", shape({ hasValue: true, hasText: false }))).toContain("客体形态");
  });

  test("citation 契约：给 objectEntity 且绑定 truthPolicy → 通过", () => {
    expect(validateObjectContract("Article", "cites", shape({ hasEntity: true }), "truth-1")).toBeNull();
  });

  test("citation 契约：未绑定 truthPolicy → 拒绝", () => {
    expect(validateObjectContract("Article", "cites", shape({ hasEntity: true }))).toContain("truthPolicy");
  });
});

describe("字典补齐", () => {
  test("Organization.url / Article.cites / CreativeWork.cites 已入字典", () => {
    expect(isValidPredicate("Organization", "url")).toBe(true);
    expect(isValidPredicate("Article", "cites")).toBe(true);
    expect(isValidPredicate("CreativeWork", "cites")).toBe(true);
  });

  test("DefinedTerm.inDefinedTermSet 仍在字典内（术语集契约就位）", () => {
    expect(isValidPredicate("DefinedTerm", "inDefinedTermSet")).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- predicate-contracts`
Expected: FAIL —— `Cannot find module '../../server/src/services/utils/predicate-contracts'`

- [ ] **Step 3: 新建契约模块**

创建 `server/src/services/utils/predicate-contracts.ts`：

```ts
// 谓词客体契约：约束「某个 entityType 的某个谓词，允许什么形态的客体」。
// 与 PREDICATE_DICTIONARY 同级；已登记契约 → 严格校验，未登记 → 放行（调用方负责 warn）。
export type ObjectKind = "entity" | "value" | "citation";

export type PredicateContract = {
  objectKinds: ObjectKind[];
  /** value/text 形态的字符上限 */
  maxLength?: number;
};

export const PREDICATE_CONTRACTS: Record<string, Record<string, PredicateContract>> = {
  Organization: {
    slogan: { objectKinds: ["value"], maxLength: 200 },
    keywords: { objectKinds: ["value"], maxLength: 200 },
    url: { objectKinds: ["value"], maxLength: 500 },
    sameAs: { objectKinds: ["value"], maxLength: 500 },
    areaServed: { objectKinds: ["entity", "value"], maxLength: 100 },
  },
  DefinedTerm: {
    termCode: { objectKinds: ["value"], maxLength: 60 },
    sameAs: { objectKinds: ["value"], maxLength: 500 },
    inDefinedTermSet: { objectKinds: ["entity"] },
  },
  Service: {
    serviceType: { objectKinds: ["value"], maxLength: 100 },
    areaServed: { objectKinds: ["entity", "value"], maxLength: 100 },
  },
  Place: {
    areaServed: { objectKinds: ["entity", "value"], maxLength: 100 },
  },
  Article: {
    cites: { objectKinds: ["citation"] },
  },
  CreativeWork: {
    cites: { objectKinds: ["citation"] },
  },
};

export function getPredicateContract(entityType: string, predicate: string): PredicateContract | null {
  return PREDICATE_CONTRACTS[entityType]?.[predicate] ?? null;
}

export type ObjectShape = {
  hasEntity: boolean;
  hasValue: boolean;
  hasText: boolean;
  textLength: number;
};

/**
 * 返回 null 表示通过，否则返回违规原因（中文，直接用于 400 响应文案）。
 * 契约语义：
 * - entity   ：必须给 objectEntity
 * - value    ：必须给 objectValue，或 objectText 且长度 ≤ maxLength
 * - citation ：必须给 objectEntity 或 objectValue，且必须绑定 truthPolicy
 */
export function validateObjectContract(
  entityType: string,
  predicate: string,
  shape: ObjectShape,
  truthPolicyId?: unknown
): string | null {
  const contract = getPredicateContract(entityType, predicate);
  if (!contract) return null;

  const kinds = contract.objectKinds;
  const allowsEntity = kinds.includes("entity");
  const allowsValue = kinds.includes("value");
  const allowsCitation = kinds.includes("citation");

  const entityOk = shape.hasEntity && (allowsEntity || allowsCitation);
  const valueOk = shape.hasValue && (allowsValue || allowsCitation);
  const textOk =
    shape.hasText &&
    (allowsValue || allowsCitation) &&
    (!contract.maxLength || shape.textLength <= contract.maxLength);

  if (!entityOk && !valueOk && !textOk) {
    if (shape.hasText && contract.maxLength && shape.textLength > contract.maxLength) {
      return `objectText 长度 ${shape.textLength} 超出上限 ${contract.maxLength}`;
    }
    return `客体形态不符合契约（允许：${kinds.join("/")}）`;
  }
  if (allowsCitation && !truthPolicyId) {
    return "citation 谓词必须绑定 truthPolicy";
  }
  return null;
}
```

- [ ] **Step 4: 补字典项**

在 `server/src/services/utils/predicate-dictionary.ts` 中：

Organization 行加 `'url'`（放在 `'sameAs'` 前）：

```ts
  Organization: ['founder', 'foundingDate', 'legalName', 'areaServed', 'numberOfEmployees',
                 'contactPoint', 'location', 'hasOfferCatalog', 'slogan', 'keywords',
                 'brand', 'knowsAbout', 'provides', 'url', 'sameAs'],
```

Article 行加 `'cites'`：

```ts
  Article: ['about', 'mentions', 'author', 'publisher', 'datePublished', 'articleSection',
            'mainEntity', 'isPartOf', 'hasPart', 'keywords', 'cites'],
```

CreativeWork 行加 `'cites'`：

```ts
  CreativeWork: ['about', 'mentions', 'author', 'publisher', 'datePublished', 'isPartOf', 'hasPart',
                 'keywords', 'isBasedOn', 'cites'],
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test -- predicate-contracts`
Expected: PASS（2 suites / 全部用例通过）

- [ ] **Step 6: 提交**

```bash
git add plugins/zhao-website/server/src/services/utils/predicate-contracts.ts plugins/zhao-website/server/src/services/utils/predicate-dictionary.ts plugins/zhao-website/tests/services/predicate-contracts.test.ts
git commit -m "feat(kg): 谓词客体契约表与校验，字典补 url/cites"
```

> 工作目录为仓库根 `e:\code\basic`。

---

## Task 2: 写入侧接入契约校验

**Files:**
- Modify: `server/src/services/knowledge-graph.ts:442-451`（addRelation）、`server/src/services/knowledge-graph.ts:568-599`（updateRelation）
- Test: `tests/services/knowledge-graph.test.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/services/knowledge-graph.test.ts` 的 `describe("Knowledge Graph Service", ...)` 内追加：

```ts
  test("addRelation 契约违规（termCode 挂超长文本）→ 400 RELATION_OBJECT_CONTRACT_VIOLATION", async () => {
    service._resolveEntityId = jest.fn(async (ref: any) => (ref === "doc-term" ? 11 : null));
    mockStrapi.db.query().findOne.mockResolvedValueOnce({ id: 11, entityType: "DefinedTerm" });

    await expect(
      service.addRelation({
        siteId: 1,
        subjectEntityId: "doc-term",
        predicate: "termCode",
        objectText: "甲".repeat(300),
      })
    ).rejects.toMatchObject({ status: 400, code: "RELATION_OBJECT_CONTRACT_VIOLATION" });
  });

  test("addRelation 契约通过（termCode 短文本）→ 正常写入", async () => {
    service._resolveEntityId = jest.fn(async (ref: any) => (ref === "doc-term" ? 11 : null));
    const queryMock = mockStrapi.db.query();
    queryMock.findOne
      .mockResolvedValueOnce({ id: 11, entityType: "DefinedTerm" })
      .mockResolvedValueOnce(null);

    await service.addRelation({
      siteId: 1,
      subjectEntityId: "doc-term",
      predicate: "termCode",
      objectText: "职业教育",
    });

    expect(queryMock.create).toHaveBeenCalled();
  });

  test("addRelation 未登记契约的字典谓词 → 仅告警不拒绝", async () => {
    service._resolveEntityId = jest.fn(async (ref: any) => (ref === "doc-org" ? 11 : null));
    const queryMock = mockStrapi.db.query();
    queryMock.findOne
      .mockResolvedValueOnce({ id: 11, entityType: "Organization" })
      .mockResolvedValueOnce(null);

    await service.addRelation({
      siteId: 1,
      subjectEntityId: "doc-org",
      predicate: "brand",
      objectText: "Joho",
    });

    expect(queryMock.create).toHaveBeenCalled();
    expect(mockStrapi.log.warn).toHaveBeenCalledWith(expect.stringContaining("contractUnregistered"));
  });

  test("updateRelation 改谓词触发契约校验违规 → 400", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne
      .mockResolvedValueOnce({ id: 3, documentId: "rel-3", subjectEntity: 11, predicate: "mentions", objectText: "甲".repeat(300) }) // 关系存在（客体为超长文本）
      .mockResolvedValueOnce({ id: 11, entityType: "DefinedTerm" }); // 主体实体

    await expect(
      service.updateRelation(1, "rel-3", { predicate: "termCode" })
    ).rejects.toMatchObject({ status: 400, code: "RELATION_OBJECT_CONTRACT_VIOLATION" });
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- knowledge-graph.test`
Expected: FAIL —— `addRelation` 未抛契约错误（第一个用例 rejection 断言失败）

- [ ] **Step 3: addRelation 接入校验**

在 `server/src/services/knowledge-graph.ts` 顶部加导入：

```ts
import { getPredicateContract, validateObjectContract } from "./utils/predicate-contracts";
```

在 `addRelation` 中，`const truthId = params.truthPolicyId ? await this._requireTruthId(params.truthPolicyId) : null;` 这一行**之后**插入：

```ts
    // 谓词客体契约校验：已登记契约 → 严格校验；字典内但未登记 → 告警放行
    if (subjectEntity) {
      const contract = getPredicateContract(subjectEntity.entityType, params.predicate);
      const shape = {
        hasEntity,
        hasValue,
        hasText,
        textLength: hasText ? String(params.objectText).length : 0,
      };
      if (contract) {
        const reason = validateObjectContract(subjectEntity.entityType, params.predicate, shape, truthId);
        if (reason) {
          const e: any = new Error(`关系客体不符合谓词契约：${reason}`);
          e.status = 400;
          e.code = "RELATION_OBJECT_CONTRACT_VIOLATION";
          throw e;
        }
      } else if (isValidPredicate(subjectEntity.entityType, params.predicate)) {
        strapi.log.warn(
          `[kg] predicate "${params.predicate}" 未登记客体契约（contractUnregistered），已放行`
        );
      }
    }
```

- [ ] **Step 4: updateRelation 接入校验**

在 `updateRelation` 中，定位到：

```ts
    const relVersion = (Number(existing.version) || 1) + 1;
    payload.version = relVersion;
```

在这两行**之前**插入（`contractRelevant` 为假时不额外查询，避免影响既有调用计数）：

```ts
    // 客体形态相关字段变更 → 契约校验（与 addRelation 同口径）
    const contractRelevant =
      payload.predicate !== undefined ||
      payload.objectEntity !== undefined ||
      payload.objectValue !== undefined ||
      payload.objectText !== undefined;
    if (contractRelevant) {
      const subjectForContract: any = payload.subjectEntity
        ? await strapi.db.query(ENTITY_UID).findOne({ where: { id: payload.subjectEntity } })
        : await strapi.db.query(ENTITY_UID).findOne({ where: { id: existing.subjectEntity } });
      if (subjectForContract) {
        const nextPredicate = payload.predicate ?? existing.predicate;
        const nextEntity = payload.objectEntity !== undefined ? payload.objectEntity : existing.objectEntity;
        const nextValue = payload.objectValue !== undefined ? payload.objectValue : existing.objectValue;
        const nextText = payload.objectText !== undefined ? payload.objectText : existing.objectText;
        const nextTruth = payload.truthPolicy !== undefined ? payload.truthPolicy : existing.truthPolicy;
        const shape = {
          hasEntity: nextEntity !== undefined && nextEntity !== null,
          hasValue: nextValue !== undefined && nextValue !== null,
          hasText: !!nextText,
          textLength: nextText ? String(nextText).length : 0,
        };
        const reason = validateObjectContract(subjectForContract.entityType, nextPredicate, shape, nextTruth);
        if (reason) {
          const e: any = new Error(`关系客体不符合谓词契约：${reason}`);
          e.status = 400;
          e.code = "RELATION_OBJECT_CONTRACT_VIOLATION";
          throw e;
        }
      }
    }
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test -- knowledge-graph.test`
Expected: PASS（含新增 4 例；既有"解绑 truthPolicyId"用例仍 `findOne` 恰好 1 次）

- [ ] **Step 6: 提交**

```bash
git add plugins/zhao-website/server/src/services/knowledge-graph.ts plugins/zhao-website/tests/services/knowledge-graph.test.ts
git commit -m "feat(kg): 关系写入/更新接入谓词客体契约校验"
```

---

## Task 3: 关系新增 evidenceText + 幂等键改为 truthPolicy

**Files:**
- Modify: `server/src/content-types/knowledge-relation/schema.json:51-53`
- Modify: `server/src/services/knowledge-graph.ts:385-503`（addRelation）、`:559-621`（updateRelation）
- Test: `tests/services/knowledge-graph.test.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/services/knowledge-graph.test.ts` 内追加：

```ts
  test("addRelation 带 evidenceText → 落库但不进公开出口字段", async () => {
    service._resolveEntityId = jest.fn(async (ref: any) => (ref === "doc-article" ? 11 : 22));
    const queryMock = mockStrapi.db.query();
    queryMock.findOne
      .mockResolvedValueOnce({ id: 11, entityType: "Article" }) // subject
      .mockResolvedValueOnce({ id: 5, documentId: "truth-doc" }) // truth
      .mockResolvedValueOnce(null); // 幂等查询未命中

    await service.addRelation({
      siteId: 1,
      subjectEntityId: "doc-article",
      predicate: "cites",
      objectEntityId: "doc-canonical",
      truthPolicyId: "truth-doc",
      evidenceText: "学习是指获取知识、技能或经验的过程。",
      sourceType: "derived",
    });

    expect(queryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          evidenceText: "学习是指获取知识、技能或经验的过程。",
          truthPolicy: 5,
        }),
      })
    );
  });

  test("addRelation 绑定 truthPolicy → 幂等键为 site+S+P+truthPolicy（非文本）", async () => {
    service._resolveEntityId = jest.fn(async (ref: any) => (ref === "doc-article" ? 11 : 22));
    const queryMock = mockStrapi.db.query();
    queryMock.findOne
      .mockResolvedValueOnce({ id: 11, entityType: "Article" })
      .mockResolvedValueOnce({ id: 5, documentId: "truth-doc" })
      .mockResolvedValueOnce(null);

    await service.addRelation({
      siteId: 1,
      subjectEntityId: "doc-article",
      predicate: "cites",
      objectEntityId: "doc-canonical",
      truthPolicyId: "truth-doc",
      evidenceText: "段落",
      sourceType: "derived",
    });

    expect(queryMock.findOne).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        where: expect.objectContaining({ site: 1, subjectEntity: 11, predicate: "cites", truthPolicy: 5 }),
      })
    );
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- knowledge-graph.test`
Expected: FAIL —— `data.evidenceText` 为 `undefined`；第 3 次 `findOne` 的 `where` 里是 `objectEntity` 而非 `truthPolicy`

- [ ] **Step 3: schema 新增 evidenceText**

在 `server/src/content-types/knowledge-relation/schema.json` 的 `objectText` 之后插入：

```json
    "evidenceText": {
      "type": "text",
      "description": "段落举证原文：仅后台可见，不进任何公开出口"
    },
```

- [ ] **Step 4: addRelation 支持 evidenceText 与新幂等键**

在 `server/src/services/knowledge-graph.ts` 的 `addRelation` 签名中，`objectText?: string;` 之后加：

```ts
    evidenceText?: string;
```

替换幂等键构造块（原 `if (objectId) {...} else if (hasText) {...}` + `if (objectId || hasText) {`）：

```ts
    // 幂等键：绑定真值 → site+S+P+truthPolicy；否则按客体实体/文本
    if (truthId) {
      idempotentWhere.truthPolicy = truthId;
    } else if (objectId) {
      idempotentWhere.objectEntity = objectId;
    } else if (hasText) {
      idempotentWhere.objectText = params.objectText;
    }
    if (truthId || objectId || hasText) {
```

在 `create` 的 `data` 中，`objectText: params.objectText || null,` 之后加：

```ts
        evidenceText: params.evidenceText || null,
```

- [ ] **Step 5: updateRelation 支持 evidenceText**

在 `updateRelation` 的 `if (data.objectText !== undefined) payload.objectText = data.objectText;` 之后加：

```ts
    if (data.evidenceText !== undefined) payload.evidenceText = data.evidenceText;
```

- [ ] **Step 6: 运行测试确认通过**

Run: `npm test -- knowledge-graph.test`
Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add plugins/zhao-website/server/src/content-types/knowledge-relation/schema.json plugins/zhao-website/server/src/services/knowledge-graph.ts plugins/zhao-website/tests/services/knowledge-graph.test.ts
git commit -m "feat(kg): 关系新增 evidenceText，绑定真值时幂等键改为 truthPolicy"
```

---

## Task 4: 派生改为引用语义（cites + evidenceText）+ 映射修正

**Files:**
- Modify: `server/src/services/utils/kg-sync.ts:106-166, 168-227`
- Modify: `server/src/services/utils/claim-predicate-map.ts:9`
- Test: `tests/services/kg-sync.test.ts`

- [ ] **Step 1: 改写失败测试**

在 `tests/services/kg-sync.test.ts` 中：

1) 把 `claim-predicate-map` 用例中的 `brand_domain_official` 断言改为 `"url"`：

```ts
    expect(mapClaimToPredicate("brand_domain_official")).toBe("url");
```

2) 把 `describe("knowledgeGraphSync 表述型派生", ...)` 整块替换为：

```ts
describe("knowledgeGraphSync 引用型派生", () => {
  let kgStub: any;

  beforeEach(() => {
    kgStub = makeKgStub();
    kgStub.upsertEntityFromContent = jest.fn().mockResolvedValue({ id: 9, documentId: "art-1" });
    createMockStrapi({
      plugin: jest.fn().mockReturnValue({ service: jest.fn().mockReturnValue(kgStub) }),
    });
  });

  test("geo-article：主体=文章派生实体，谓词=cites，客体=规范实体，段落进 evidenceText", async () => {
    await knowledgeGraphSync("website-geo-article", makeContent());

    expect(kgStub.addRelation).toHaveBeenCalledTimes(1);
    expect(kgStub.addRelation).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: 1,
        subjectEntityId: "art-1",
        predicate: "cites",
        objectEntityId: "ent-1",
        truthPolicyId: "truth-1",
        evidenceText: "学习是指获取知识、技能或经验的过程，贯穿人生各阶段。",
        sourceType: "derived",
      })
    );
  });

  test("段落文本不得进入属性谓词值域（反向用例）", async () => {
    await knowledgeGraphSync("website-geo-article", makeContent());

    const call = kgStub.addRelation.mock.calls[0][0];
    expect(["slogan", "keywords", "termCode", "sameAs"]).not.toContain(call.predicate);
    expect(call.objectText).toBeUndefined();
    expect(call.evidenceText).toBeDefined();
  });

  test("真值无 canonicalEntity → 客体降级为 objectValue（规范值）", async () => {
    await knowledgeGraphSync(
      "website-geo-article",
      makeContent({
        truthBasis: [
          { documentId: "truth-2", claimKey: "domain_learning_def", canonicalValue: "获取知识的过程" },
        ],
      })
    );

    expect(kgStub.addRelation).toHaveBeenCalledWith(
      expect.objectContaining({ predicate: "cites", objectValue: "获取知识的过程" })
    );
    expect(kgStub.addRelation.mock.calls[0][0].objectEntityId).toBeUndefined();
  });

  test("section='开篇' → 取引言段作为 evidenceText", async () => {
    await knowledgeGraphSync(
      "website-geo-article",
      makeContent({
        truthBasisSections: [{ claimKey: "domain_learning_def", section: "开篇" }],
        truthBasis: [
          { documentId: "truth-13", claimKey: "domain_learning_def", canonicalEntity: { documentId: "ent-13", entityType: "DefinedTerm" } },
        ],
      })
    );

    expect(kgStub.addRelation).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectEntityId: "art-1",
        predicate: "cites",
        objectEntityId: "ent-13",
        evidenceText: "「一技傍身，吃遍天下」的时代正在过去。学习是指获取知识、技能或经验的过程。",
      })
    );
  });

  test("正文未定位到段落 → warn 且不写入", async () => {
    await knowledgeGraphSync(
      "website-geo-article",
      makeContent({ truthBasisSections: [{ claimKey: "domain_learning_def", section: "不存在的段落" }] })
    );

    expect(kgStub.addRelation).not.toHaveBeenCalled();
    expect((global as any).strapi.log.warn).toHaveBeenCalled();
  });

  test("claimKey 未在文章 truthBasis 中找到对应真值 → warn 跳过", async () => {
    await knowledgeGraphSync(
      "website-geo-article",
      makeContent({
        truthBasisSections: [{ claimKey: "unknown_claim", section: "一、引言" }],
        truthBasis: [
          { documentId: "truth-9", claimKey: "other_claim", canonicalEntity: { documentId: "ent-9", entityType: "Organization" } },
        ],
      })
    );

    expect(kgStub.addRelation).not.toHaveBeenCalled();
    expect((global as any).strapi.log.warn).toHaveBeenCalled();
  });

  test("真值既无 canonicalEntity 也无 canonicalValue → warn 跳过", async () => {
    await knowledgeGraphSync(
      "website-geo-article",
      makeContent({
        truthBasis: [{ documentId: "truth-3", claimKey: "domain_learning_def", canonicalValue: "" }],
      })
    );

    expect(kgStub.addRelation).not.toHaveBeenCalled();
    expect((global as any).strapi.log.warn).toHaveBeenCalled();
  });

  test("有 truthBasisSections 但未绑定 truthBasis → warn 且不写入", async () => {
    await knowledgeGraphSync("website-geo-article", makeContent({ truthBasis: [] }));

    expect(kgStub.addRelation).not.toHaveBeenCalled();
    expect((global as any).strapi.log.warn).toHaveBeenCalled();
  });

  test("geo-article 回查 populate 使用对象形式（混合数组会被 Strapi 拒绝）", async () => {
    await knowledgeGraphSync("website-geo-article", makeContent());

    const queryFn = (global as any).strapi.db.query as jest.Mock;
    const returnedQuery = queryFn.mock.results[0].value;
    expect(returnedQuery.findOne).toHaveBeenCalled();
    const args = returnedQuery.findOne.mock.calls[0][0];
    expect(Array.isArray(args.populate)).toBe(false);
    expect(args.populate).toEqual({
      mentionedEntities: true,
      site: true,
      truthBasis: { populate: ["canonicalEntity"] },
    });
  });

  test("派生实体 upsert 时带上内容 slug（中文标题自动生成会为空串）", async () => {
    await knowledgeGraphSync("website-geo-article", makeContent({ slug: "career-lifelong-learning-plan" }));

    expect(kgStub.upsertEntityFromContent).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: 1,
        slug: "career-lifelong-learning-plan",
        refTargetType: "website-geo-article",
      })
    );
  });

  test("缺少 site → warn 且不派生（siteId 为写入必需）", async () => {
    await knowledgeGraphSync("website-geo-article", makeContent({ site: undefined }));

    expect(kgStub.addRelation).not.toHaveBeenCalled();
    expect(kgStub.upsertEntityFromContent).not.toHaveBeenCalled();
    expect((global as any).strapi.log.warn).toHaveBeenCalled();
  });

  test("非 geo-article 不触发引用派生", async () => {
    await knowledgeGraphSync("website-article", makeContent());

    expect(kgStub.addRelation).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- kg-sync`
Expected: FAIL —— `predicate` 实际为 `termCode`，`subjectEntityId` 实际为 `ent-1`

- [ ] **Step 3: 修正映射表**

`server/src/services/utils/claim-predicate-map.ts` 第 9 行：

```ts
  { prefix: "brand_domain_", predicate: "url" }, // Organization.url
```

并把文件头注释补一句：

```ts
// 注：段落举证已改为引用语义（Article.cites，见 kg-sync），本表保留为 claimKey→谓词对照，
// 供人工建立断言型关系时查用。
```

- [ ] **Step 4: 改写 syncTruthBasisRelations**

把 `server/src/services/utils/kg-sync.ts` 中 `syncTruthBasisRelations` 的 doc comment 与函数体整体替换为：

```ts
/**
 * 从 truthBasisSections 派生「引用型」关系：
 * 主体 = 文章的派生实体，谓词 = cites，客体 = 真值规范实体（优先）或规范值；
 * 段落原文写入 evidenceText（仅后台可见）。
 * 幂等键由 addRelation 按 truthPolicy 去重。
 */
async function syncTruthBasisRelations(
  content: any,
  kgService: any,
  siteId: number,
  derivedEntity: any
): Promise<void> {
  const sections = Array.isArray(content.truthBasisSections) ? content.truthBasisSections : [];
  if (sections.length === 0) return;
  if (!derivedEntity?.documentId) {
    strapi.log.warn(
      `[zhao-website] kg-sync: geo-article ${content.documentId} 无派生实体，跳过引用关系派生`
    );
    return;
  }
  const truths = Array.isArray(content.truthBasis) ? content.truthBasis : [];
  if (truths.length === 0) {
    strapi.log.warn(
      `[zhao-website] kg-sync: geo-article ${content.documentId} 配置了 truthBasisSections 但未绑定 truthBasis`
    );
    return;
  }
  const truthByKey = new Map<string, any>();
  for (const t of truths) {
    if (t && t.claimKey) truthByKey.set(String(t.claimKey), t);
  }

  for (const item of sections) {
    const claimKey = item && item.claimKey ? String(item.claimKey) : "";
    const section = item && item.section ? String(item.section) : "";
    if (!claimKey || !section) continue;

    const truth = truthByKey.get(claimKey);
    if (!truth) {
      strapi.log.warn(`[zhao-website] kg-sync: claimKey "${claimKey}" 未在文章 truthBasis 中找到对应真值，跳过`);
      continue;
    }
    const evidenceText = extractSectionText(content.content, section);
    if (!evidenceText) {
      strapi.log.warn(`[zhao-website] kg-sync: 正文未定位到段落「${section}」（claimKey "${claimKey}"），跳过`);
      continue;
    }
    const canonicalEntityId = truth.canonicalEntity?.documentId;
    const canonicalValue = truth.canonicalValue;
    if (!canonicalEntityId && (canonicalValue === undefined || canonicalValue === null || canonicalValue === "")) {
      strapi.log.warn(`[zhao-website] kg-sync: 真值 "${claimKey}" 既无 canonicalEntity 也无 canonicalValue，跳过`);
      continue;
    }

    await kgService.addRelation({
      siteId,
      subjectEntityId: derivedEntity.documentId,
      predicate: "cites",
      ...(canonicalEntityId ? { objectEntityId: canonicalEntityId } : { objectValue: canonicalValue }),
      truthPolicyId: truth.documentId,
      evidenceText,
      sourceType: "derived",
    });
  }
}
```

> `MAX_OBJECT_TEXT` 仍由 `extractSectionText` 用于段落截断，保留不变。

- [ ] **Step 5: knowledgeGraphSync 传入派生实体**

在 `knowledgeGraphSync` 中替换第 1 步与第 3 步：

```ts
    // 1. mainEntity 已显式关联 → 跳过派生；否则 upsert 派生实体并留作引用关系主体
    let derivedEntity: any = null;
    if (content.mainEntity && content.mainEntity.documentId) {
      // 已有显式关联，不派生
    } else {
      const entityType = ENTITY_TYPE_MAP[targetType] || "CreativeWork";
      derivedEntity = await (kgService as any).upsertEntityFromContent({
        siteId,
        entityType,
        name: content.title || content.name || content.question,
        slug: content.slug,
        refTargetType: targetType,
        refTargetId: content.documentId,
      });
    }
```

```ts
    // 3. truthBasisSections 派生引用型关系（主体取文章派生实体）
    if (targetType === "website-geo-article") {
      await syncTruthBasisRelations(content, kgService, siteId, derivedEntity);
    }
```

（第 2 步 `mentionedEntities` 块保持原样，`isValidPredicate` 导入仍需保留。）

- [ ] **Step 6: 运行测试确认通过**

Run: `npm test -- kg-sync`
Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add plugins/zhao-website/server/src/services/utils/kg-sync.ts plugins/zhao-website/server/src/services/utils/claim-predicate-map.ts plugins/zhao-website/tests/services/kg-sync.test.ts
git commit -m "refactor(kg): 段落举证由属性断言改为 cites 引用语义，brand_domain_* 映射改 url"
```

---

## Task 5: 出口读时隔离（图谱节点 + 实体详情）

**Files:**
- Modify: `server/src/services/knowledge-graph.ts:683-734, 745-780`
- Test: `tests/services/knowledge-graph.test.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/services/knowledge-graph.test.ts` 内追加：

```ts
  test("_entityToJsonLd 隔离契约违规关系（termCode 挂超长文本不进输出）", () => {
    const jsonLd = service._entityToJsonLd(
      { documentId: "doc-term", name: "学习", entityType: "DefinedTerm", slug: "learning" },
      [
        { predicate: "termCode", objectText: "甲".repeat(300) },
        { predicate: "termCode", objectText: "职业教育" },
      ]
    );

    expect(jsonLd.termCode).toBe("职业教育");
  });

  test("_entityToJsonLd 未登记契约的关系照常输出", () => {
    const jsonLd = service._entityToJsonLd(
      { documentId: "doc-a", name: "A", entityType: "Organization", slug: "a" },
      [{ predicate: "brand", objectText: "任意长文本".repeat(50) }]
    );

    expect(jsonLd.brand).toBeDefined();
  });

  test("exportEntity 的 outgoing/incoming 不输出契约违规关系", async () => {
    service.findEntityBySlug = jest.fn().mockResolvedValue({
      id: 1, documentId: "doc-org", name: "Joho", entityType: "Organization", slug: "joho-cn",
    });
    service._resolveEntityId = jest.fn().mockResolvedValue(1);
    service.findArticlesByEntity = jest.fn().mockResolvedValue([]);
    const queryMock = mockStrapi.db.query();
    queryMock.findMany
      .mockResolvedValueOnce([
        { documentId: "rel-1", predicate: "slogan", objectText: "让学习更简单" },
        { documentId: "rel-2", predicate: "slogan", objectText: "长".repeat(300) },
      ]) // outgoing
      .mockResolvedValueOnce([]); // incoming

    const result = await service.exportEntity(1, "joho-cn");

    expect(result.outgoing).toHaveLength(1);
    expect(result.outgoing[0].objectText).toBe("让学习更简单");
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- knowledge-graph.test`
Expected: FAIL —— `jsonLd.termCode` 为数组含 300 字文本；`result.outgoing` 长度为 2

- [ ] **Step 3: 新增违规判定 helper**

在 `server/src/services/knowledge-graph.ts` 的 `exportGraph` 之前插入：

```ts
  /** 关系是否违反客体契约（读时隔离用；未登记契约或未知主体类型 → 不违规） */
  _isContractViolation(subjectEntityType: string | undefined, relation: any): boolean {
    if (!subjectEntityType) return false;
    if (!getPredicateContract(subjectEntityType, relation.predicate)) return false;
    const hasText = !!relation.objectText;
    const reason = validateObjectContract(
      subjectEntityType,
      relation.predicate,
      {
        hasEntity: !!relation.objectEntity,
        hasValue: relation.objectValue !== undefined && relation.objectValue !== null,
        hasText,
        textLength: hasText ? String(relation.objectText).length : 0,
      },
      relation.truthPolicy
    );
    return !!reason;
  },
```

- [ ] **Step 4: _entityToJsonLd 内过滤**

在 `_entityToJsonLd` 的 `for (const rel of outgoing) {` 之前插入：

```ts
    const visibleOutgoing = outgoing.filter(
      (rel: any) => !this._isContractViolation(entity.entityType, rel)
    );
    for (const rel of visibleOutgoing) {
```

并把原 `for (const rel of outgoing) {` 行删除。

- [ ] **Step 5: exportEntity 内过滤**

在 `exportEntity` 中，替换：

```ts
    const articles = await this.findArticlesByEntity(siteId, entityId);
    return {
      ...this._entityToJsonLd(entity, outgoing, incoming),
```

为：

```ts
    const articles = await this.findArticlesByEntity(siteId, entityId);
    const visibleOutgoing = outgoing.filter((r: any) => !this._isContractViolation(entity.entityType, r));
    const visibleIncoming = incoming.filter(
      (r: any) => !this._isContractViolation(r.subjectEntity?.entityType, r)
    );
    return {
      ...this._entityToJsonLd(entity, visibleOutgoing, visibleIncoming),
```

并把紧随其后的 `outgoing.map(...)` / `incoming.map(...)` 两处改为 `visibleOutgoing.map(...)` / `visibleIncoming.map(...)`。

- [ ] **Step 6: 运行测试确认通过**

Run: `npm test -- knowledge-graph.test`
Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add plugins/zhao-website/server/src/services/knowledge-graph.ts plugins/zhao-website/tests/services/knowledge-graph.test.ts
git commit -m "feat(kg): 公开出口读时隔离契约违规关系（不改存量数据）"
```

---

## Task 6: 出口一致性——@id 绝对化 + rejected 过滤 + 可信度字段

**Files:**
- Modify: `server/src/services/knowledge-graph.ts:683-780`
- Test: `tests/services/knowledge-graph.test.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/services/knowledge-graph.test.ts` 内追加：

```ts
  test("exportGraph 过滤 rejected 实体（与另两个出口口径统一）", async () => {
    const queryMock = mockStrapi.db.query();

    await service.exportGraph(1);

    const where = queryMock.findMany.mock.calls[0][0].where;
    for (const branch of where.$or) {
      expect(branch).toEqual(expect.objectContaining({ verificationStatus: { $ne: "rejected" } }));
    }
  });

  test("exportGraph 节点 @id 为绝对 URL", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 1, domain: "www.joho.cn" }); // site-config
    queryMock.findMany
      .mockResolvedValueOnce([{ documentId: "doc-a", name: "A", entityType: "Organization", slug: "ent-a" }])
      .mockResolvedValueOnce([]);

    const result = await service.exportGraph(1);

    expect(result["@graph"][0]["@id"]).toBe("https://www.joho.cn/knowledge/ent-a");
  });

  test("节点输出补 verificationStatus / confidence / lastVerifiedAt", () => {
    const jsonLd = service._entityToJsonLd({
      documentId: "doc-a", name: "A", entityType: "Organization", slug: "a",
      verificationStatus: "pending", confidence: 0.8, lastVerifiedAt: "2026-09-01T00:00:00.000Z",
    });

    expect(jsonLd.verificationStatus).toBe("pending");
    expect(jsonLd.confidence).toBe(0.8);
    expect(jsonLd.lastVerifiedAt).toBe("2026-09-01T00:00:00.000Z");
  });

  test("无 siteUrl 时 @id 回退为 slug（单测/后台导出不受影响）", () => {
    const jsonLd = service._entityToJsonLd({ documentId: "doc-a", name: "A", entityType: "Organization", slug: "a" });
    expect(jsonLd["@id"]).toBe("a");
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- knowledge-graph.test`
Expected: FAIL —— `where` 无 `verificationStatus`；`@graph[0]["@id"]` 为 `"ent-a"`；`verificationStatus` 为 `undefined`

- [ ] **Step 3: 新增 siteUrl 解析与统一 @id 工具**

在 `server/src/services/knowledge-graph.ts` 文件顶部（`normalizeText` 之前）加：

```ts
/** 实体公开 @id：优先绝对 URL（/knowledge/{slug}），无 siteUrl 时回退 slug */
function entityPublicId(entity: any, siteUrl?: string): string {
  const slug = entity?.slug || entity?.documentId;
  if (siteUrl && slug) return `${siteUrl}/knowledge/${slug}`;
  return slug;
}
```

在 service 内新增方法（放在 `findEntityBySlug` 之前）：

```ts
  /** 站点绝对 URL（site-config.domain 裸域名补协议）；缺失返回空串 */
  async _resolveSiteUrl(siteId: number): Promise<string> {
    const cfg = await strapi.db.query("plugin::zhao-common.site-config").findOne({ where: { id: siteId } });
    const domain = cfg?.domain;
    if (!domain) return "";
    return /^https?:\/\//.test(domain) ? domain : `https://${domain}`;
  },
```

- [ ] **Step 4: exportGraph 补 rejected 过滤 + siteUrl**

替换 `exportGraph`：

```ts
  async exportGraph(siteId: number): Promise<any> {
    // 派生实体是内容 CT 的内部节点，不进公开图谱；rejected 与另两个出口口径统一
    const scope = {
      deletedAt: null,
      status: true,
      sourceType: { $ne: "derived" },
      verificationStatus: { $ne: "rejected" },
    };
    const siteUrl = await this._resolveSiteUrl(siteId);
    const entities = await strapi.db.query(ENTITY_UID).findMany({
      where: { $or: [{ site: siteId, ...scope }, { site: null, ...scope }] },
      populate: ["image"],
    });
    const relations = await strapi.db.query(RELATION_UID).findMany({
      where: { $or: [{ site: siteId, deletedAt: null, status: true }, { site: null, deletedAt: null, status: true }] },
      populate: ["subjectEntity", "objectEntity"],
    });
    const graph = entities.map((e: any) =>
      this._entityToJsonLd(e, relations.filter((r: any) => r.subjectEntity?.id === e.id), [], siteUrl)
    );
    return { "@context": "https://schema.org", "@graph": graph };
  },
```

- [ ] **Step 5: _entityToJsonLd 支持 siteUrl + 可信度字段**

替换 `_entityToJsonLd` 的头两行与 `@id` 行：

```ts
  _entityToJsonLd(entity: any, outgoing: any[] = [], incoming: any[] = [], siteUrl?: string): any {
    const jsonLd: any = {
      "@type": entity.entityType,
      "@id": entityPublicId(entity, siteUrl),
      "name": entity.name,
    };
    // 公开出口的合规字段：版本号 + 最后修改时间（不露操作人/理由）
    jsonLd.version = entity.version ?? 1;
    if (entity.updatedAt) jsonLd.dateModified = entity.updatedAt;
    jsonLd.verificationStatus = entity.verificationStatus ?? "verified";
    jsonLd.confidence = entity.confidence ?? 1;
    if (entity.lastVerifiedAt) jsonLd.lastVerifiedAt = entity.lastVerifiedAt;
```

（原 `if (entity.updatedAt) ...` 之后的 `if (entity.description)` 等保持不变。）

并把同函数内关系展开的物体实体分支改为绝对 URL：

```ts
      if (rel.objectEntity) {
        value = { "@id": entityPublicId(rel.objectEntity, siteUrl) };
```

- [ ] **Step 6: exportEntity 用 siteUrl 并统一关系 @id**

在 `exportEntity` 开头 `const entity = await this.findEntityBySlug(siteId, slug);` 之后加：

```ts
    const siteUrl = await this._resolveSiteUrl(siteId);
```

把 `...this._entityToJsonLd(entity, visibleOutgoing, visibleIncoming),` 改为：

```ts
      ...this._entityToJsonLd(entity, visibleOutgoing, visibleIncoming, siteUrl),
```

并把两处 `"@id": r.objectEntity.slug || r.objectEntity.documentId` / `"@id": r.subjectEntity.slug || r.subjectEntity.documentId` 改为：

```ts
        objectEntity: r.objectEntity ? { slug: r.objectEntity.slug, name: r.objectEntity.name, "@id": entityPublicId(r.objectEntity, siteUrl) } : undefined,
```

```ts
        subjectEntity: r.subjectEntity ? { slug: r.subjectEntity.slug, name: r.subjectEntity.name, "@id": entityPublicId(r.subjectEntity, siteUrl) } : undefined,
```

- [ ] **Step 7: 运行测试确认通过**

Run: `npm test -- knowledge-graph.test`
Expected: PASS

- [ ] **Step 8: 提交**

```bash
git add plugins/zhao-website/server/src/services/knowledge-graph.ts plugins/zhao-website/tests/services/knowledge-graph.test.ts
git commit -m "feat(kg): 出口 @id 绝对化、补 rejected 过滤与可信度字段"
```

---

# P1 — 治理

## Task 7: `knowledge-health` 只读检测服务

**Files:**
- Create: `server/src/services/knowledge-health.ts`
- Modify: `server/src/services/index.ts`
- Test: `tests/services/knowledge-health.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `tests/services/knowledge-health.test.ts`：

```ts
import healthFactory from "../../server/src/services/knowledge-health";
import { createMockStrapiWithQuery } from "../helpers/mock-strapi";

function setup(byUid: Record<string, any>) {
  const mockStrapi: any = createMockStrapiWithQuery(byUid);
  return healthFactory({ strapi: mockStrapi });
}

describe("knowledge-health.completeness", () => {
  test("统计实体缺口 / 事实缺口 / 关系违规", async () => {
    const service = setup({
      "plugin::zhao-website.knowledge-entity": {
        findMany: jest.fn().mockResolvedValue([
          { documentId: "e1", description: "d", url: "https://a", identifier: "1", sameAs: ["x"] },
          { documentId: "e2", description: "", url: "", identifier: "", sameAs: [] },
        ]),
      },
      "plugin::zhao-website.first-truth-policy": {
        findMany: jest.fn().mockResolvedValue([
          { documentId: "f1", claimKey: "k1", claimCategory: "other", canonicalSourceUrl: "https://s", canonicalSourceType: "official_site", canonicalEntity: { id: 1 } },
          { documentId: "f2", claimKey: "k2", claimCategory: "other", canonicalSourceUrl: "", canonicalSourceType: "internal", canonicalEntity: null },
        ]),
      },
      "plugin::zhao-website.knowledge-relation": {
        findMany: jest.fn().mockResolvedValue([
          { documentId: "r1", predicate: "termCode", objectText: "甲".repeat(300), subjectEntity: { entityType: "DefinedTerm" } },
          { documentId: "r2", predicate: "cites", objectEntity: { id: 2 }, truthPolicy: { id: 5 }, subjectEntity: { entityType: "Article" } },
          { documentId: "r3", predicate: "cites", objectEntity: { id: 3 }, truthPolicy: null, subjectEntity: { entityType: "Article" } },
        ]),
      },
    });

    const result = await service.completeness(1);

    expect(result.entities).toEqual({ total: 2, missingSameAs: 1, missingDescription: 1, missingUrl: 1, missingIdentifier: 1 });
    expect(result.facts).toEqual(expect.objectContaining({
      total: 2, missingSourceUrl: 1, internalSourceCount: 1, otherCategoryCount: 2, unboundCanonicalEntity: 1,
    }));
    expect(result.facts.emptyCategories).toContain("terminology_definition");
    expect(result.facts.unclassifiedOther).toHaveLength(2);
    // r1（超长文本）与 r3（citation 未绑真值）各构成 1 次契约违规
    expect(result.relations).toEqual({ total: 3, contractViolations: 2, missingTruthPolicy: 1 });
  });

  test("isCitable：有 sourceUrl 或权威来源类型", () => {
    const service = setup({});
    expect(service.isCitable({ canonicalSourceUrl: "https://x" })).toBe(true);
    expect(service.isCitable({ canonicalSourceType: "government" })).toBe(true);
    expect(service.isCitable({ canonicalSourceType: "internal" })).toBe(false);
  });
});

describe("knowledge-health.violations", () => {
  test("仅返回已登记契约的违规项，含预览", async () => {
    const service = setup({
      "plugin::zhao-website.knowledge-relation": {
        findMany: jest.fn().mockResolvedValue([
          { documentId: "r1", predicate: "termCode", objectText: "甲".repeat(300), subjectEntity: { name: "学习", entityType: "DefinedTerm" } },
          { documentId: "r2", predicate: "brand", objectText: "很长".repeat(200), subjectEntity: { name: "Joho", entityType: "Organization" } },
        ]),
      },
    });

    const rows = await service.violations(1);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(expect.objectContaining({
      relationDocumentId: "r1",
      subjectEntity: "学习",
      predicate: "termCode",
    }));
    expect(rows[0].objectPreview.length).toBeLessThanOrEqual(80);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- knowledge-health`
Expected: FAIL —— `Cannot find module '../../server/src/services/knowledge-health'`

- [ ] **Step 3: 实现服务**

创建 `server/src/services/knowledge-health.ts`：

```ts
import type { Core } from "@strapi/strapi";
import { getPredicateContract, validateObjectContract } from "./utils/predicate-contracts";

const ENTITY_UID = "plugin::zhao-website.knowledge-entity";
const RELATION_UID = "plugin::zhao-website.knowledge-relation";
const TRUTH_UID = "plugin::zhao-website.first-truth-policy";

/** 对外可引用门槛：权威来源类型 */
export const CITABLE_SOURCE_TYPES = ["government", "official_site", "third_party_verified"];

const ALL_CATEGORIES = [
  "business_license", "brand_claim", "technical_spec", "certification",
  "financial", "logistics_promise", "terminology_definition", "other",
];

const siteScope = (siteId: number) => ({
  $or: [{ site: siteId, deletedAt: null }, { site: null, deletedAt: null }],
});

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /** 关系客体形态快照（供契约校验） */
  _shape(relation: any) {
    const hasText = !!relation.objectText;
    return {
      hasEntity: !!relation.objectEntity,
      hasValue: relation.objectValue !== undefined && relation.objectValue !== null,
      hasText,
      textLength: hasText ? String(relation.objectText).length : 0,
    };
  },

  /** 已登记契约的关系违规原因；未登记返回 null */
  _violationReason(relation: any): string | null {
    const entityType = relation.subjectEntity?.entityType;
    if (!entityType) return null;
    if (!getPredicateContract(entityType, relation.predicate)) return null;
    return validateObjectContract(entityType, relation.predicate, this._shape(relation), relation.truthPolicy);
  },

  isCitable(fact: any): boolean {
    return !!fact?.canonicalSourceUrl || CITABLE_SOURCE_TYPES.includes(fact?.canonicalSourceType);
  },

  async completeness(siteId: number) {
    const entities = await strapi.db.query(ENTITY_UID).findMany({ where: siteScope(siteId) });
    const facts = await strapi.db.query(TRUTH_UID).findMany({
      where: siteScope(siteId),
      populate: ["canonicalEntity"],
    });
    const relations = await strapi.db.query(RELATION_UID).findMany({
      where: siteScope(siteId),
      populate: ["subjectEntity", "objectEntity"],
    });

    const entityStats = { total: entities.length, missingSameAs: 0, missingDescription: 0, missingUrl: 0, missingIdentifier: 0 };
    for (const e of entities as any[]) {
      if (!e.sameAs || (Array.isArray(e.sameAs) && e.sameAs.length === 0)) entityStats.missingSameAs++;
      if (!e.description) entityStats.missingDescription++;
      if (!e.url) entityStats.missingUrl++;
      if (!e.identifier) entityStats.missingIdentifier++;
    }

    const categoryCount: Record<string, number> = {};
    for (const c of ALL_CATEGORIES) categoryCount[c] = 0;
    const factStats = {
      total: facts.length, missingSourceUrl: 0, internalSourceCount: 0,
      otherCategoryCount: 0, unboundCanonicalEntity: 0,
      emptyCategories: [] as string[],
      unclassifiedOther: [] as Array<{ documentId: string; claimKey: string; claim: string }>,
    };
    for (const f of facts as any[]) {
      if (!f.canonicalSourceUrl) factStats.missingSourceUrl++;
      if (f.canonicalSourceType === "internal") factStats.internalSourceCount++;
      if (f.claimCategory && categoryCount[f.claimCategory] !== undefined) categoryCount[f.claimCategory]++;
      if (!f.canonicalEntity) factStats.unboundCanonicalEntity++;
      if (f.claimCategory === "other") {
        factStats.otherCategoryCount++;
        factStats.unclassifiedOther.push({ documentId: f.documentId, claimKey: f.claimKey, claim: f.claim });
      }
    }
    factStats.emptyCategories = ALL_CATEGORIES.filter((c) => categoryCount[c] === 0);

    let contractViolations = 0;
    let missingTruthPolicy = 0;
    for (const r of relations as any[]) {
      if (this._violationReason(r)) contractViolations++;
      if (r.predicate === "cites" && !r.truthPolicy) missingTruthPolicy++;
    }

    return {
      entities: entityStats,
      facts: factStats,
      relations: { total: relations.length, contractViolations, missingTruthPolicy },
    };
  },

  async violations(siteId: number) {
    const relations = await strapi.db.query(RELATION_UID).findMany({
      where: siteScope(siteId),
      populate: ["subjectEntity", "objectEntity"],
    });
    const rows: any[] = [];
    for (const r of relations as any[]) {
      const reason = this._violationReason(r);
      if (!reason) continue;
      const preview = r.objectText
        ? String(r.objectText).slice(0, 80)
        : (r.objectEntity?.name ?? (r.objectValue == null ? "" : String(r.objectValue)));
      rows.push({
        relationDocumentId: r.documentId,
        subjectEntity: r.subjectEntity?.name ?? "",
        predicate: r.predicate,
        reason,
        objectPreview: preview,
      });
    }
    return rows;
  },
});
```

- [ ] **Step 4: 注册服务**

在 `server/src/services/index.ts` 中加导入与注册：

```ts
import knowledgeHealth from "./knowledge-health";
```

```ts
  "knowledge-health": knowledgeHealth,
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test -- knowledge-health`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add plugins/zhao-website/server/src/services/knowledge-health.ts plugins/zhao-website/server/src/services/index.ts plugins/zhao-website/tests/services/knowledge-health.test.ts
git commit -m "feat(kg): 新增只读 knowledge-health 完备度与违规检测服务"
```

---

## Task 8: `claimCategory` 新增 `terminology_definition`

**Files:**
- Modify: `server/src/content-types/first-truth-policy/schema.json:34-46`
- Test: `tests/content-types.test.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/content-types.test.ts` 的 `describe('Content Types', ...)` 内追加：

```ts
  test('first-truth-policy.claimCategory 含 terminology_definition（术语定义类真值）', () => {
    const enums = contentTypes['first-truth-policy'].schema.attributes.claimCategory.enum;
    expect(enums).toContain('terminology_definition');
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- content-types`
Expected: FAIL —— 枚举中不存在 `terminology_definition`

- [ ] **Step 3: 扩枚举**

在 `server/src/content-types/first-truth-policy/schema.json` 的 `claimCategory.enum` 中，`"logistics_promise",` 之后插入：

```json
        "terminology_definition",
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- content-types`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add plugins/zhao-website/server/src/content-types/first-truth-policy/schema.json plugins/zhao-website/tests/content-types.test.ts
git commit -m "feat(truth): claimCategory 新增 terminology_definition"
```

---

## Task 9: 后台「知识完备度」面板（admin 控制器 + 路由 + 页面）

**Files:**
- Create: `server/src/controllers/admin-api/knowledge-health.ts`
- Modify: `server/src/controllers/index.ts`
- Modify: `server/src/routes/admin-api.ts:100`
- Modify: `admin/src/utils/api.ts:20`
- Modify: `admin/src/pages/KnowledgeGraphPage.tsx`
- Test: `tests/api/admin-knowledge-health.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `tests/api/admin-knowledge-health.test.ts`：

```ts
import { createMockStrapi } from "../helpers/mock-strapi";

function createMockCtx(overrides: Record<string, any> = {}): any {
  return { state: { siteId: 1 }, request: { body: {}, query: {} }, query: {}, params: {}, body: null, status: 200, ...overrides };
}

describe("Admin API - knowledge-health", () => {
  let mockStrapi: any;
  let healthService: any;
  let controller: any;

  beforeEach(() => {
    healthService = {
      completeness: jest.fn().mockResolvedValue({ entities: {}, facts: {}, relations: {} }),
      violations: jest.fn().mockResolvedValue([]),
    };
    mockStrapi = createMockStrapi({
      plugin: jest.fn().mockReturnValue({ service: jest.fn().mockReturnValue(healthService) }),
    });
    controller = require("../../server/src/controllers/admin-api/knowledge-health").default;
  });

  test("completeness 透传 siteId", async () => {
    const ctx = createMockCtx();
    await controller.completeness(ctx);
    expect(healthService.completeness).toHaveBeenCalledWith(1);
    expect(ctx.body).toEqual({ entities: {}, facts: {}, relations: {} });
  });

  test("violations 透传 siteId", async () => {
    const ctx = createMockCtx();
    await controller.violations(ctx);
    expect(healthService.violations).toHaveBeenCalledWith(1);
    expect(ctx.body).toEqual([]);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- admin-knowledge-health`
Expected: FAIL —— `Cannot find module '../../server/src/controllers/admin-api/knowledge-health'`

- [ ] **Step 3: 新建 admin 控制器**

创建 `server/src/controllers/admin-api/knowledge-health.ts`：

```ts
export default {
  async completeness(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-health").completeness(ctx.state.siteId);
  },
  async violations(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-health").violations(ctx.state.siteId);
  },
};
```

- [ ] **Step 4: 注册控制器**

在 `server/src/controllers/index.ts` 加导入：

```ts
import adminKnowledgeHealth from "./admin-api/knowledge-health";
```

并在 `export default { ... }` 的最后一个成员之后加（`controllers/index.ts` 无 `"knowledge-audit"` 键，追加到末尾即可）：

```ts
  "knowledge-health": adminKnowledgeHealth,
```

- [ ] **Step 5: 注册 admin 路由**

在 `server/src/routes/admin-api.ts` 第 100 行 `channelScopeRoute("GET", "/knowledge-audit-logs", ...)` 之前插入：

```ts
    channelScopeRoute("GET", "/knowledge-health/completeness", "knowledge-health.completeness", "knowledge-entity.read"),
    channelScopeRoute("GET", "/knowledge-health/violations", "knowledge-health.violations", "knowledge-entity.read"),
```

- [ ] **Step 6: 运行测试确认通过**

Run: `npm test -- admin-knowledge-health`
Expected: PASS

- [ ] **Step 7: 前端接口常量 + 面板**

在 `admin/src/utils/api.ts` 的 `kgExportGraph` 之后加：

```ts
  kgHealthCompleteness: `${ADMIN_BASE}/knowledge-health/completeness`,
  kgHealthViolations: `${ADMIN_BASE}/knowledge-health/violations`,
```

在 `admin/src/pages/KnowledgeGraphPage.tsx` 中，`Tabs` 的 `items` 数组末尾（`relations` 项之后）追加：

```tsx
          {
            key: 'health',
            label: '完备度',
            children: <KnowledgeHealthPanel />,
          },
```

在文件末尾 `export default KnowledgeGraphPage;` 之前追加子组件：

```tsx
const KnowledgeHealthPanel = () => {
  const [data, setData] = useState<any>(null);
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [c, v] = await Promise.all([
        fetch(API.kgHealthCompleteness).then((r) => r.json()),
        fetch(API.kgHealthViolations).then((r) => r.json()),
      ]);
      setData(c);
      setViolations(Array.isArray(v) ? v : []);
    } catch (err) {
      message.error(`完备度加载失败: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportCleanupList = () => {
    const blob = new Blob([JSON.stringify({ completeness: data, violations }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'knowledge-cleanup-list.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!data && !loading) {
    return <Button onClick={load}>加载完备度</Button>;
  }

  const gapRows = data
    ? [
        { key: 'missingSameAs', item: '实体缺 sameAs', count: data.entities.missingSameAs },
        { key: 'missingDescription', item: '实体缺 description', count: data.entities.missingDescription },
        { key: 'missingUrl', item: '实体缺 url', count: data.entities.missingUrl },
        { key: 'missingIdentifier', item: '实体缺 identifier', count: data.entities.missingIdentifier },
        { key: 'missingSourceUrl', item: '真值缺 sourceUrl', count: data.facts.missingSourceUrl },
        { key: 'internalSourceCount', item: '真值来源 internal', count: data.facts.internalSourceCount },
        { key: 'otherCategoryCount', item: '真值分类 other', count: data.facts.otherCategoryCount },
        { key: 'unboundCanonicalEntity', item: '真值未绑规范实体', count: data.facts.unboundCanonicalEntity },
        { key: 'contractViolations', item: '关系客体契约违规', count: data.relations.contractViolations },
        { key: 'missingTruthPolicy', item: '引用关系未绑真值', count: data.relations.missingTruthPolicy },
      ]
    : [];

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Space>
        <Button onClick={load} loading={loading}>刷新</Button>
        <Button icon={<ExportOutlined />} onClick={exportCleanupList} disabled={!data}>导出清理清单 JSON</Button>
      </Space>
      <Table
        rowKey="key"
        size="small"
        pagination={false}
        dataSource={gapRows}
        columns={[
          { title: '缺口项', dataIndex: 'item' },
          { title: '数量', dataIndex: 'count' },
        ]}
      />
      {data ? <div>空分类：{data.facts.emptyCategories.join(', ') || '无'}</div> : null}
      <Table
        rowKey="relationDocumentId"
        size="small"
        dataSource={violations}
        columns={[
          { title: '主体实体', dataIndex: 'subjectEntity' },
          { title: '谓词', dataIndex: 'predicate' },
          { title: '违规原因', dataIndex: 'reason' },
          { title: '客体预览', dataIndex: 'objectPreview' },
        ]}
      />
    </Space>
  );
};
```

- [ ] **Step 8: 构建验证**

Run: `npm run build`
Expected: 成功产出 `dist/server` 与 `dist/admin`（无 TS 报错）

- [ ] **Step 9: 提交**

```bash
git add plugins/zhao-website/server/src/controllers/admin-api/knowledge-health.ts plugins/zhao-website/server/src/controllers/index.ts plugins/zhao-website/server/src/routes/admin-api.ts plugins/zhao-website/admin/src/utils/api.ts plugins/zhao-website/admin/src/pages/KnowledgeGraphPage.tsx plugins/zhao-website/tests/api/admin-knowledge-health.test.ts
git commit -m "feat(admin): 知识完备度面板与 knowledge-health admin 接口"
```

---

## Task 10: `llms.txt` 补空段 + 引用指引

**Files:**
- Modify: `server/src/services/llms-txt.ts:96-131`
- Test: `tests/services/seo-output.test.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/services/seo-output.test.ts` 的 `describe("llms.txt 服务", ...)` 内追加：

```ts
  test("Brand Voice 无数据时不输出空段标题", async () => {
    const { mockStrapi } = setup({
      "plugin::zhao-website.brand-voice": { findMany: [] },
    });
    const txt = await llmsTxtFactory({ strapi: mockStrapi }).generate(1, SITE_URL);

    expect(txt).not.toContain("## Brand Voice");
  });

  test("Brand Voice 有数据时列出条目", async () => {
    const { mockStrapi } = setup({
      "plugin::zhao-website.brand-voice": { findMany: [{ category: "tone", name: "专业", content: "克制、专业" }] },
    });
    const txt = await llmsTxtFactory({ strapi: mockStrapi }).generate(1, SITE_URL);

    expect(txt).toContain("## Brand Voice");
    expect(txt).toContain("- [tone] 专业: 克制、专业");
  });

  test("新增引用指引与时效段", async () => {
    const { mockStrapi } = setup({});
    const txt = await llmsTxtFactory({ strapi: mockStrapi }).generate(1, SITE_URL);

    expect(txt).toContain("## Citation Guide");
    expect(txt).toContain("lastVerifiedAt");
    expect(txt).toContain(`${SITE_URL}/api/zhao-website/v1/facts.json`);
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- seo-output`
Expected: FAIL —— 空品牌话术时仍输出 `## Brand Voice`；无 `## Citation Guide`

- [ ] **Step 3: 改 llms-txt.ts**

把 `server/src/services/llms-txt.ts` 中 `lines.push("## Brand Voice");` 起至 `return lines.join("\n");` 之前的整段替换为：

```ts
    lines.push("## Citation Guide");
    lines.push("- 引用本页事实时，请以 facts.json 中的 version 与 lastVerifiedAt 为时效基准，并标注 sourceUrl。");
    lines.push("- 未提供 sourceUrl 的第一真值视为未核验，请勿作为权威引用。");
    lines.push("- 术语与实体定义以 knowledge-graph.json 的 @id 为准，关系不得跨实体推断。");
    lines.push("");

    // 品牌话术：无数据时不输出空段标题（此前会留下一个空章节）
    const voices = await strapi.db.query("plugin::zhao-website.brand-voice").findMany({
      where: { $or: [{ site: siteId, status: true, deletedAt: null }, { site: null, status: true, deletedAt: null }] },
      orderBy: { category: "ASC" },
    });
    if (voices.length > 0) {
      lines.push("## Brand Voice");
      for (const v of voices) {
        lines.push(`- [${v.category}] ${v.name}: ${v.content.substring(0, 200)}`);
      }
      lines.push("");
    }

    return lines.join("\n");
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- seo-output`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add plugins/zhao-website/server/src/services/llms-txt.ts plugins/zhao-website/tests/services/seo-output.test.ts
git commit -m "feat(geo): llms.txt 消除空段并补引用指引与时效说明"
```

---

## Task 11: 新增 `llms-full.txt`（服务 + 控制器 + 路由 + nginx）

**Files:**
- Modify: `server/src/services/llms-txt.ts`
- Modify: `server/src/controllers/content-api/seo-output.ts`
- Modify: `server/src/routes/content-api.ts:43`
- Modify: `e:\code\strapi-site\nginx\www.joho.cn.conf`（另一仓库）
- Test: `tests/services/seo-output.test.ts`、`tests/api/content-api.test.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/services/seo-output.test.ts` 的 `describe("llms.txt 服务", ...)` 之后新增：

```ts
describe("llms-full.txt 服务", () => {
  test("输出实体、关系与事实三段，事实带可引用标记", async () => {
    const kg = {
      exportGraph: jest.fn().mockResolvedValue({
        "@graph": [
          { "@id": "https://example.com/knowledge/learning", "@type": "DefinedTerm", name: "学习", version: 2, lastVerifiedAt: "2026-09-01T00:00:00.000Z", description: "获取知识的过程", cites: { "@id": "https://example.com/geo-article/x" } },
        ],
      }),
      exportFacts: jest.fn().mockResolvedValue([
        { claimKey: "k1", claim: "员工规模", value: "200", sourceUrl: "https://s", sourceType: "official_site", version: 1, lastVerifiedAt: "2026-09-01T00:00:00.000Z" },
        { claimKey: "k2", claim: "内部口径", value: "x", sourceUrl: "", sourceType: "internal", version: 1 },
      ]),
    };
    const { mockStrapi } = setup({}, { "knowledge-graph": kg });

    const txt = await llmsTxtFactory({ strapi: mockStrapi }).generateFull(1, SITE_URL);

    expect(txt).toContain("# ");
    expect(txt).toContain("## Entities");
    expect(txt).toContain("https://example.com/knowledge/learning");
    expect(txt).toContain("## Facts");
    expect(txt).toContain("citable: yes");
    expect(txt).toContain("citable: no");
  });
});
```

在 `tests/api/content-api.test.ts` 的 `describe("Content API - sitemap", ...)` 之后新增：

```ts
describe("Content API - llms-full.txt", () => {
  test("GET /llms-full.txt → service.llms-txt.generateFull", async () => {
    const llmsService = { generateFull: jest.fn().mockResolvedValue("# Full") };
    const mockStrapi = createMockStrapi({
      plugin: jest.fn().mockReturnValue({ service: jest.fn().mockReturnValue(llmsService) }),
    });
    const controller = require("../../server/src/controllers/content-api/seo-output").default;
    const ctx = createMockCtx({
      state: { siteId: 1 },
      request: { host: "example.com", headers: {}, ip: "127.0.0.1", body: {}, query: {} },
    });

    await controller.llmsFullTxt(ctx);

    expect(llmsService.generateFull).toHaveBeenCalledWith(1, "https://example.com");
    expect(ctx.body).toBe("# Full");
    expect(ctx.type).toBe("text/plain");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- seo-output content-api`
Expected: FAIL —— `generateFull is not a function` / `controller.llmsFullTxt is not a function`

- [ ] **Step 3: 实现 generateFull**

在 `server/src/services/llms-txt.ts` 的 service 对象中（`generate` 之后）加：

```ts
  /**
   * llms-full.txt：在 llms.txt 的导航之上，给出可直接消费的实体、关系三元组与事实清单。
   * 复用公开出口（exportGraph/exportFacts），保证与 JSON 出口同口径、同隔离。
   */
  async generateFull(siteId: number, siteUrl: string): Promise<string> {
    const kg: any = strapi.plugin("zhao-website").service("knowledge-graph");
    const graph = await kg.exportGraph(siteId);
    const facts = await kg.exportFacts(siteId);
    const lines: string[] = [];

    lines.push(`# Knowledge Feed`);
    lines.push("");
    lines.push("## Entities");
    for (const node of graph["@graph"] || []) {
      const desc = node.description ? ` | description: ${node.description}` : "";
      const verified = node.lastVerifiedAt ? ` | lastVerifiedAt: ${node.lastVerifiedAt}` : "";
      lines.push(`- @id: ${node["@id"]} | type: ${node["@type"]} | name: ${node.name} | version: ${node.version ?? 1}${desc}${verified}`);
    }
    lines.push("");
    lines.push("## Relations");
    const reserved = new Set(["@context", "@id", "@type", "name", "version", "dateModified", "description", "url", "image", "verificationStatus", "confidence", "lastVerifiedAt"]);
    for (const node of graph["@graph"] || []) {
      for (const [predicate, value] of Object.entries(node)) {
        if (reserved.has(predicate)) continue;
        const objects = Array.isArray(value) ? value : [value];
        for (const o of objects) {
          const obj = o && typeof o === "object" && "@id" in (o as any) ? (o as any)["@id"] : o;
          lines.push(`- ${node["@id"]} --${predicate}--> ${obj}`);
        }
      }
    }
    lines.push("");
    lines.push("## Facts");
    for (const f of facts) {
      const source = f.sourceUrl ? `source: ${f.sourceUrl}` : "source: none";
      const citable = f.sourceUrl || ["government", "official_site", "third_party_verified"].includes(f.sourceType);
      lines.push(`- ${f.claim}: ${f.value} (${source}, citable: ${citable ? "yes" : "no"}, version: ${f.version ?? 1})`);
    }
    lines.push("");
    return lines.join("\n");
  },
```

- [ ] **Step 4: 加控制器方法**

在 `server/src/controllers/content-api/seo-output.ts` 的 `llmsTxt` 之后加：

```ts
  async llmsFullTxt(ctx: any) {
    const siteId = ctx.state.siteId;
    const siteUrl = await getSiteUrl(siteId, ctx.request.host);
    const txt = await strapi.plugin("zhao-website").service("llms-txt").generateFull(siteId, siteUrl);
    ctx.type = "text/plain";
    ctx.body = txt;
  },
```

- [ ] **Step 5: 加公开路由**

在 `server/src/routes/content-api.ts` 的 `publicRoute("GET", "/llms.txt", "seo-output.llmsTxt"),` 之后加：

```ts
    publicRoute("GET", "/llms-full.txt", "seo-output.llmsFullTxt"),
```

- [ ] **Step 6: 运行测试确认通过**

Run: `npm test -- seo-output content-api`
Expected: PASS

- [ ] **Step 7: nginx 加反代 location（另一仓库）**

在 `e:\code\strapi-site\nginx\www.joho.cn.conf` 的 `location = /llms.txt { ... }` 之后插入：

```nginx
    location = /llms-full.txt {
        proxy_pass http://127.0.0.1:1337/api/zhao-website/v1/llms-full.txt;
    }
```

- [ ] **Step 8: 提交（分两个仓库）**

```bash
git add plugins/zhao-website/server/src/services/llms-txt.ts plugins/zhao-website/server/src/controllers/content-api/seo-output.ts plugins/zhao-website/server/src/routes/content-api.ts plugins/zhao-website/tests/services/seo-output.test.ts plugins/zhao-website/tests/api/content-api.test.ts
git commit -m "feat(geo): 新增 llms-full.txt 机器学习可读全量出口"
```

```bash
# 在 e:\code\strapi-site 下
git add nginx/www.joho.cn.conf
git commit -m "chore(nginx): 反代 /llms-full.txt 到 strapi GEO 出口"
```

---

## Task 12: `robots.txt` 显式 AI UA + `sitemap.xml` 补 `lastmod`

**Files:**
- Modify: `server/src/services/robots.ts:19-39`
- Modify: `server/src/services/sitemap.ts:21-29`
- Test: `tests/services/seo-output.test.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/services/seo-output.test.ts` 的 `describe("robots 服务", ...)` 内追加：

```ts
  test("allow_all 时显式声明主流 AI 爬虫允许抓取", async () => {
    const { mockStrapi } = setup({}, { "seo-config": { get: jest.fn().mockResolvedValue({ enableRobotsTxt: true }) } });
    const txt = await robotsFactory({ strapi: mockStrapi }).generate(1, SITE_URL);

    expect(txt).toContain("User-agent: GPTBot\nAllow: /");
    expect(txt).toContain("User-agent: ClaudeBot\nAllow: /");
    expect(txt).toContain("User-agent: Google-Extended\nAllow: /");
  });

  test("sitemap 首页输出 lastmod", async () => {
    const sitemapFactory = require("../../server/src/services/sitemap").default;
    const { mockStrapi } = setup({
      "plugin::zhao-common.site-config": { findOne: { id: 1, updatedAt: "2026-09-01T00:00:00.000Z" } },
    });
    const xml = await sitemapFactory({ strapi: mockStrapi }).generate(1, SITE_URL);

    expect(xml).toContain("<loc>https://example.com/</loc>");
    expect(xml).toContain("<lastmod>2026-09-01T00:00:00.000Z</lastmod>");
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- seo-output`
Expected: FAIL —— 无 `User-agent: GPTBot\nAllow: /`；首页 `<url>` 无 `<lastmod>`

- [ ] **Step 3: robots.ts 加显式 AI UA 段**

在 `server/src/services/robots.ts` 的 `lines.push("User-agent: *", "Allow: /", "Disallow: /admin", "Disallow: /api");` 之前插入：

```ts
    // 显式声明主流 AI 爬虫可抓取（未列入 AI_CRAWLER_LIST 的仍受 User-agent: * 约束）
    if (policy === "allow_all") {
      for (const bot of AI_CRAWLER_LIST) {
        lines.push(`User-agent: ${bot}`, "Allow: /");
      }
    }
```

- [ ] **Step 4: sitemap.ts 首页补 lastmod**

在 `server/src/services/sitemap.ts` 的 `const seoConfig = await ...` 之后加：

```ts
    const siteConfig = await strapi.db.query("plugin::zhao-common.site-config").findOne({ where: { id: siteId } });
```

并把首页行替换为：

```ts
    urls.push(this._urlEntry(siteUrl, "/", "1.0", "daily", siteConfig?.updatedAt, undefined, hreflangEntries));
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test -- seo-output`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add plugins/zhao-website/server/src/services/robots.ts plugins/zhao-website/server/src/services/sitemap.ts plugins/zhao-website/tests/services/seo-output.test.ts
git commit -m "feat(geo): robots 显式声明 AI 爬虫，sitemap 首页补 lastmod"
```

---

## Task 13: 实体 JSON-LD 补 `subjectOf` 解释链

**Files:**
- Modify: `server/src/services/knowledge-graph.ts:698-734`（exportEntity）
- Test: `tests/services/knowledge-graph.test.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/services/knowledge-graph.test.ts` 内追加：

```ts
  test("exportEntity 输出 subjectOf 指向解释文章（绝对 URL）", async () => {
    service.findEntityBySlug = jest.fn().mockResolvedValue({
      id: 1, documentId: "doc-term", name: "学习", entityType: "DefinedTerm", slug: "learning",
    });
    service._resolveEntityId = jest.fn().mockResolvedValue(1);
    service.findArticlesByEntity = jest.fn().mockResolvedValue([
      { slug: "career-learning", title: "长期学习规划", type: "geo-article" },
    ]);
    service._resolveSiteUrl = jest.fn().mockResolvedValue("https://www.joho.cn");
    const queryMock = mockStrapi.db.query();
    queryMock.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await service.exportEntity(1, "learning");

    expect(result.subjectOf).toEqual([
      { "@type": "Article", "@id": "https://www.joho.cn/geo-article/career-learning", name: "长期学习规划" },
    ]);
  });

  test("无解释文章时不输出 subjectOf", async () => {
    service.findEntityBySlug = jest.fn().mockResolvedValue({
      id: 1, documentId: "doc-term", name: "学习", entityType: "DefinedTerm", slug: "learning",
    });
    service._resolveEntityId = jest.fn().mockResolvedValue(1);
    service.findArticlesByEntity = jest.fn().mockResolvedValue([]);
    service._resolveSiteUrl = jest.fn().mockResolvedValue("https://www.joho.cn");
    mockStrapi.db.query().findMany.mockResolvedValue([]);

    const result = await service.exportEntity(1, "learning");

    expect(result.subjectOf).toBeUndefined();
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- knowledge-graph.test`
Expected: FAIL —— `result.subjectOf` 为 `undefined`（第一个用例）

- [ ] **Step 3: exportEntity 补 subjectOf**

在 `server/src/services/knowledge-graph.ts` 的 `exportEntity` 中，把：

```ts
    return {
      ...this._entityToJsonLd(entity, visibleOutgoing, visibleIncoming, siteUrl),
```

替换为：

```ts
    const subjectOf = articles
      .filter((a: any) => a.slug && a.type)
      .map((a: any) => ({
        "@type": "Article",
        "@id": `${siteUrl}/${a.type}/${a.slug}`,
        name: a.title,
      }));
    return {
      ...this._entityToJsonLd(entity, visibleOutgoing, visibleIncoming, siteUrl),
      ...(subjectOf.length > 0 ? { subjectOf } : {}),
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- knowledge-graph.test`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add plugins/zhao-website/server/src/services/knowledge-graph.ts plugins/zhao-website/tests/services/knowledge-graph.test.ts
git commit -m "feat(kg): 实体 JSON-LD 补 subjectOf 解释链"
```

---

## Task 14: `cites` 公开输出限流（同 truthPolicy 仅最新一条）

**Files:**
- Modify: `server/src/services/knowledge-graph.ts:683-734`
- Test: `tests/services/knowledge-graph.test.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/services/knowledge-graph.test.ts` 内追加：

```ts
  test("_dedupeCitations 同 truthPolicy 仅保留最新一条", () => {
    const kept = service._dedupeCitations([
      { id: 1, predicate: "cites", truthPolicy: { documentId: "t1" }, updatedAt: "2026-01-01T00:00:00.000Z", objectValue: "旧" },
      { id: 2, predicate: "cites", truthPolicy: { documentId: "t1" }, updatedAt: "2026-09-01T00:00:00.000Z", objectValue: "新" },
      { id: 3, predicate: "cites", truthPolicy: { documentId: "t2" }, updatedAt: "2026-01-01T00:00:00.000Z", objectValue: "另一真值" },
      { id: 4, predicate: "mentions", objectEntity: { id: 9 } },
    ]);

    expect(kept.filter((r: any) => r.predicate === "cites")).toHaveLength(2);
    expect(kept.some((r: any) => r.id === 2)).toBe(true);
    expect(kept.some((r: any) => r.id === 1)).toBe(false);
    expect(kept.some((r: any) => r.predicate === "mentions")).toBe(true);
  });

  test("exportEntity 的 outgoing 对 cites 限流", async () => {
    service.findEntityBySlug = jest.fn().mockResolvedValue({
      id: 1, documentId: "doc-art", name: "文章", entityType: "Article", slug: "career-learning",
    });
    service._resolveEntityId = jest.fn().mockResolvedValue(1);
    service.findArticlesByEntity = jest.fn().mockResolvedValue([]);
    service._resolveSiteUrl = jest.fn().mockResolvedValue("https://www.joho.cn");
    const queryMock = mockStrapi.db.query();
    queryMock.findMany
      .mockResolvedValueOnce([
        { id: 1, predicate: "cites", truthPolicy: { documentId: "t1" }, updatedAt: "2026-01-01T00:00:00.000Z", objectValue: "旧" },
        { id: 2, predicate: "cites", truthPolicy: { documentId: "t1" }, updatedAt: "2026-09-01T00:00:00.000Z", objectValue: "新" },
      ])
      .mockResolvedValueOnce([]);

    const result = await service.exportEntity(1, "career-learning");

    expect(result.outgoing).toHaveLength(1);
    expect(result.outgoing[0].objectValue).toBe("新");
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- knowledge-graph.test`
Expected: FAIL —— `service._dedupeCitations is not a function`

- [ ] **Step 3: 实现 _dedupeCitations**

在 `server/src/services/knowledge-graph.ts` 的 `_isContractViolation` 之后加：

```ts
  /** cites 关系按 truthPolicy 去重，仅保留最新（updatedAt 最大）一条；其余关系原样保留 */
  _dedupeCitations(relations: any[]): any[] {
    const latest = new Map<string, any>();
    const others: any[] = [];
    for (const r of relations) {
      if (r.predicate !== "cites") {
        others.push(r);
        continue;
      }
      const truthRef = r.truthPolicy;
      const key = String(truthRef && typeof truthRef === "object" ? truthRef.documentId ?? truthRef.id : truthRef ?? r.id);
      const prev = latest.get(key);
      if (!prev || String(r.updatedAt ?? "") > String(prev.updatedAt ?? "")) latest.set(key, r);
    }
    return [...others, ...latest.values()];
  },
```

- [ ] **Step 4: exportEntity 接入限流**

把 `exportEntity` 中：

```ts
    const visibleOutgoing = outgoing.filter((r: any) => !this._isContractViolation(entity.entityType, r));
    const visibleIncoming = incoming.filter(
      (r: any) => !this._isContractViolation(r.subjectEntity?.entityType, r)
    );
```

替换为：

```ts
    const visibleOutgoing = this._dedupeCitations(
      outgoing.filter((r: any) => !this._isContractViolation(entity.entityType, r))
    );
    const visibleIncoming = incoming.filter(
      (r: any) => !this._isContractViolation(r.subjectEntity?.entityType, r)
    );
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test -- knowledge-graph.test`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add plugins/zhao-website/server/src/services/knowledge-graph.ts plugins/zhao-website/tests/services/knowledge-graph.test.ts
git commit -m "feat(kg): cites 公开输出按 truthPolicy 限流为最新一条"
```

---

## Task 15: 全量回归 + 构建

**Files:** 无（仅验证）

- [ ] **Step 1: 全量测试**

Run: `npm test`
Expected: 全部 suite 通过（原 13 suites / 145 tests + 本计划新增用例）

- [ ] **Step 2: 后端类型检查**

Run: `npm run test:ts:back`
Expected: 无 TS 报错

- [ ] **Step 3: 插件构建**

Run: `npm run build`
Expected: `dist/server` 与 `dist/admin` 产出成功

- [ ] **Step 4: 部署（插件仓库）**

```powershell
# PowerShell 下 ssh 传参用单引号包裹，避免双引号/括号被本地解析
ssh joho 'cd /www/apps/strapi && git pull --ff-only && pm2 startOrReload ecosystem.config.cjs --update-env'
```

- [ ] **Step 5: 部署（strapi-site 仓库）**

```powershell
# 在 e:\code\strapi-site 下：构建前必须删除 .next（Next fetch-cache 会复用旧 API 响应）
Remove-Item -Recurse -Force .next
.\deploy-www.ps1
# 等待日志出现 SYNC_OK
```

- [ ] **Step 6: 线上取证**

```bash
curl -s https://www.joho.cn/api/zhao-website/v1/knowledge-graph.json | head -c 600
curl -s https://www.joho.cn/api/zhao-website/v1/knowledge-graph/joho-cn
curl -s https://www.joho.cn/llms-full.txt | head -c 300
curl -s https://www.joho.cn/llms.txt | tail -30
curl -s https://www.joho.cn/robots.txt
curl -s https://www.joho.cn/sitemap.xml | head -c 400
```

Expected：
- `knowledge-graph.json`：无 `"verificationStatus":"rejected"`；节点含 `verificationStatus`/`confidence`；`@id` 为 `https://www.joho.cn/knowledge/...`
- `joho-cn`：`slogan`/`keywords` 各仅 1 条且为规范值（长文本条目被隔离）
- `/llms-full.txt`：200 且含 `## Entities` / `## Facts`（`citable:` 标记）
- `/llms.txt`：无空章节，含 `## Citation Guide`
- `/robots.txt`：含 `User-agent: GPTBot` 等 AI UA 段
- `/sitemap.xml`：首页 `<url>` 含 `<lastmod>`

- [ ] **Step 7: 人工数据治理（不在代码范围）**

用后台「知识完备度」面板导出清理清单，按清单人工处理：补 `sameAs`/`sourceUrl`、重分类存量 `other`（→ `terminology_definition` 等）、清理隔离出的历史污染关系。此步不做脚本批写。

---

## 覆盖对照（spec → task）

| Spec 章节 | Task |
|---|---|
| 6.1 谓词客体契约（含分级校验、`inDefinedTermSet` 结构就位） | Task 1、Task 2 |
| 6.2 引用语义分离（cites + evidenceText + 幂等键；映射修正） | Task 3、Task 4 |
| 6.3 出口读时隔离 | Task 5 |
| 6.4 公开出口契约（`@id`/rejected/可信度/`subjectOf`） | Task 6、Task 13 |
| 6.5 AI 投喂四件套（llms.txt / llms-full.txt + nginx / robots / sitemap） | Task 10、Task 11、Task 12 |
| 6.6 knowledge-health 服务 + admin 路由 + 后台面板 | Task 7、Task 9 |
| 7 数据模型变更（evidenceText / terminology_definition） | Task 3、Task 8 |
| 8 P0-1..5 | Task 1、2、3、4、5、6 |
| 8 P1-6 | Task 7、Task 9 |
| 8 P1-7 | Task 8 |
| 8 P1-8 | Task 10、Task 11 |
| 8 P1-9 | Task 12 |
| 8 P1-10 | Task 13 |
| 8 P1-11 | Task 1（契约与字典就位），实体数据人工 |
| 8 P1-12 | Task 14 |
| 9 自动化测试 | 各 Task 内 TDD 用例 + Task 15 回归 |
| 9 线上取证 | Task 15 Step 6 |