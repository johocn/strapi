import type { Core } from "@strapi/strapi";

const TYPE_UID: Record<string, string> = {
  article: "plugin::zhao-website.article",
  geoArticle: "plugin::zhao-website.geo-article",
  case: "plugin::zhao-website.case",
  product: "plugin::zhao-website.product",
  faq: "plugin::zhao-website.faq",
  tutorial: "plugin::zhao-website.tutorial",
  course: "plugin::zhao-course.course",
  lesson: "plugin::zhao-course.course-lesson",
  activity: "plugin::zhao-point.activity",
};

const ALL_TYPES = Object.keys(TYPE_UID);

// 各类型可查字段与摘要字段（CT schema 不一致，不能统一 fields）
const TYPE_FIELDS: Record<string, string[]> = {
  article: ["title", "slug", "excerpt", "updatedAt"],
  geoArticle: ["title", "slug", "summaryPoints", "updatedAt"],
  case: ["title", "slug", "clientDescription", "updatedAt"],
  product: ["title", "slug", "description", "updatedAt"],
  faq: ["question", "slug", "answer", "updatedAt"],
  tutorial: ["title", "slug", "description", "updatedAt"],
  course: ["title", "slug", "description", "updatedAt"],
  lesson: ["title", "slug", "updatedAt"],
  activity: ["title", "slug", "description", "updatedAt"],
};
const TYPE_SUMMARY: Record<string, string> = {
  article: "excerpt",
  geoArticle: "summaryPoints",
  case: "clientDescription",
  product: "description",
  faq: "answer",
  tutorial: "description",
  course: "description",
  lesson: "",
  activity: "description",
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findByTags(tagIds: string[], types: string[], limit = 3, exclude = "") {
    const result: Record<string, any[]> = {};
    for (const type of types) {
      const uid = TYPE_UID[type];
      if (!uid) continue;
      const filters: any = { tags: { documentId: { $in: tagIds } } };
      if (exclude && type === "activity") filters.documentId = { $ne: exclude };
      const docs: any[] = await (strapi.documents as any)(uid).findMany({
        filters,
        limit,
        sort: { updatedAt: "desc" } as any,
        fields: TYPE_FIELDS[type] ?? ["title", "slug", "updatedAt"],
      });
      const summaryKey = TYPE_SUMMARY[type] ?? "";
      result[type] = docs.map((d) => ({
        type,
        documentId: d.documentId,
        title: d.title ?? d.question ?? d.name ?? "",
        summary: summaryKey ? d[summaryKey] ?? "" : "",
        url: this.buildUrl(type, d),
      }));
    }
    return result;
  },

  buildUrl(type: string, d: any) {
    switch (type) {
      case "geoArticle":
        return d.slug ? `https://www.joho.cn/geo-article/${d.slug}` : "";
      case "course":
        return `https://v.joho.cn/pages/course-detail/course-detail?id=${d.documentId}`;
      case "activity":
        return `https://v.joho.cn/pages/activity/detail?id=${d.documentId}`;
      default:
        return ""; // article/case/product/faq/tutorial/lesson 暂无落地页
    }
  },

  defaultTypes() {
    return ALL_TYPES;
  },
});
