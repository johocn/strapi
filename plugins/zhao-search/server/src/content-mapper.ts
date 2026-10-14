import type { KbDocument } from "./services/meili";

// 内容类型 → KbDocument 映射配置（字段名实测自各 schema.json，防映射错位）：
// zhao-website 五类内容均为 draftAndPublish=false + 自定义 status(枚举 draft/published/archived)
// + publishedAt(datetime) + deletedAt(软删除)；pluginOptions.i18n.localized=true（每 locale 一行）；
// tags 为 plugin::zhao-tag.tag 多对多关系（取 tag.name）。
// 注：zhao-studio/knowledge-point-index 为文章↔知识点关联索引表（无 title/body），不入库检索索引。
export interface ContentTypeMap {
  type: string;
  titleField: string;
  bodyFields: string[]; // 多字段按顺序以换行拼接
  publishedField: string;
  statusField?: string;
  statusValue?: string;
  deletedField?: string;
  tagsField?: string;
  localized: boolean;
}

export const CONTENT_MAP: Record<string, ContentTypeMap> = {
  "plugin::zhao-website.article": {
    type: "article",
    titleField: "title",
    bodyFields: ["content"],
    publishedField: "publishedAt",
    statusField: "status",
    statusValue: "published",
    deletedField: "deletedAt",
    tagsField: "tags",
    localized: true,
  },
  "plugin::zhao-website.faq": {
    type: "faq",
    titleField: "question",
    bodyFields: ["answer"],
    publishedField: "publishedAt",
    statusField: "status",
    statusValue: "published",
    deletedField: "deletedAt",
    tagsField: "tags",
    localized: true,
  },
  "plugin::zhao-website.tutorial": {
    type: "tutorial",
    titleField: "title",
    bodyFields: ["description"],
    publishedField: "publishedAt",
    statusField: "status",
    statusValue: "published",
    deletedField: "deletedAt",
    tagsField: "tags",
    localized: true,
  },
  "plugin::zhao-website.case": {
    type: "case",
    titleField: "title",
    bodyFields: ["challenge", "solution"],
    publishedField: "publishedAt",
    statusField: "status",
    statusValue: "published",
    deletedField: "deletedAt",
    tagsField: "tags",
    localized: true,
  },
  "plugin::zhao-website.download": {
    type: "download",
    titleField: "name",
    bodyFields: ["description"],
    publishedField: "publishedAt",
    statusField: "status",
    statusValue: "published",
    deletedField: "deletedAt",
    tagsField: "tags",
    localized: true,
  },
  // GEO 文章（zh-CN 原生内容，2026-10-14 纳入索引：修复 kb-zh 内容域 0 文档）
  "plugin::zhao-website.geo-article": {
    type: "geo-article",
    titleField: "title",
    bodyFields: ["content"],
    publishedField: "publishedAt",
    statusField: "status",
    statusValue: "published",
    deletedField: "deletedAt",
    tagsField: "tags",
    localized: true,
  },
};

export const isPublishedEntry = (m: ContentTypeMap, entry: any): boolean => {
  if (!entry?.[m.publishedField]) return false;
  if (m.statusField && entry[m.statusField] !== m.statusValue) return false;
  if (m.deletedField && entry[m.deletedField]) return false;
  return true;
};

const stripHtml = (s: unknown): string =>
  String(s ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000);

// strapi locale（zh-CN/en/ja/ko/ru）→ 索引 locale：仅 kb-zh/kb-en 两个索引，zh 系归 zh，其余归 en
const toIndexLocale = (locale: unknown): "zh" | "en" =>
  String(locale ?? "").toLowerCase().startsWith("zh") ? "zh" : "en";

const normalizeTags = (tags: any): string[] => {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t: any) =>
      typeof t === "string" || typeof t === "number" ? String(t) : String(t?.name ?? t?.documentId ?? t?.id ?? "")
    )
    .filter(Boolean);
};

const toUpdatedAt = (entry: any): number => {
  const ts = new Date(entry?.updatedAt ?? Date.now()).getTime();
  return Number.isFinite(ts) ? ts : Date.now();
};

const toDocument = (m: ContentTypeMap, entry: any): KbDocument => {
  const docId = String(entry.documentId ?? entry.id);
  const body = m.bodyFields
    .map((f) => stripHtml(entry[f]))
    .filter(Boolean)
    .join("\n")
    .slice(0, 5000);
  return {
    id: m.localized ? `${m.type}-${docId}-${toIndexLocale(entry.locale)}` : `${m.type}-${docId}`,
    type: m.type,
    sourceId: docId,
    sourceSystem: "strapi",
    url: `/kb/${m.type}/${docId}`,
    channelId: String(entry.tenantId ?? "0"),
    status: "published",
    tags: normalizeTags(m.tagsField ? entry[m.tagsField] : undefined),
    title: String(entry[m.titleField] ?? ""),
    body,
    updatedAt: toUpdatedAt(entry),
  };
};

// 产出该 entry 对应的 { locale, doc } 列表：
// - 本地化内容：按 entry.locale 只写对应索引（zh 系 → kb-zh，其余 → kb-en），id 带 locale 后缀
// - 非本地化内容：同一文档写 kb-zh 与 kb-en 两个索引（同文，查询侧按 locale 查各自索引）
export const toContentDocuments = (modelUid: string, entry: any): Array<{ locale: string; doc: KbDocument }> => {
  const m = CONTENT_MAP[modelUid];
  if (!m || !isPublishedEntry(m, entry)) return [];
  const doc = toDocument(m, entry);
  if (m.localized) return [{ locale: toIndexLocale(entry.locale), doc }];
  return ["zh", "en"].map((locale) => ({ locale, doc }));
};

// 删除用：由内容 id 推导各索引中的候选文档 id（删不存在的 id 在 Meili delete-batch 中为无操作）
export const documentIdsFor = (modelUid: string, entryId: any): string[] => {
  const m = CONTENT_MAP[modelUid];
  if (!m || entryId == null) return [];
  const docId = String(entryId);
  return m.localized ? [`${m.type}-${docId}-zh`, `${m.type}-${docId}-en`] : [`${m.type}-${docId}`];
};
