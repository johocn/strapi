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
