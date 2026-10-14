import type { Core } from "@strapi/strapi";

export interface KbDocument {
  id: string;
  type: string;
  sourceId: string;
  sourceSystem: "vendure" | "strapi";
  url: string;
  channelId: string;
  status: string;
  tags: string[];
  title: string;
  body: string;
  updatedAt: number;
}

export interface MeiliIndexStatus {
  index: string;
  documents: number;
  healthy: boolean;
}

// 与 vendure 侧 packages/meilisearch-plugin/src/meili.service.ts 同构（去 Nest 装饰器），
// 索引设置保持两端一致，任一端写入都不会覆盖另一端的 schema 配置。
export default ({ strapi }: { strapi: Core.Strapi }) => {
  const host = strapi.config.get("plugin::zhao-search.host") || process.env.MEILI_HOST || "http://127.0.0.1:7700";
  const adminKey = strapi.config.get("plugin::zhao-search.adminKey") || process.env.MEILI_ADMIN_KEY || "";
  const indexPrefix = strapi.config.get("plugin::zhao-search.indexPrefix") || "kb";
  const locales: string[] = strapi.config.get("plugin::zhao-search.locales") || ["zh", "en"];

  const req = async (method: string, path: string, body?: unknown): Promise<any> => {
    const res = await fetch(`${host}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${adminKey}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Meili ${method} ${path} -> ${res.status}: ${await res.text()}`);
    return res.status === 204 ? null : res.json();
  };

  const indexUid = (locale: string) => `${indexPrefix}-${locale}`;

  // createIndex + 设置均幂等（重复调用无副作用）
  const ensureIndexes = async (): Promise<void> => {
    for (const locale of locales) {
      const uid = indexUid(locale);
      await req("POST", "/indexes", { uid, primaryKey: "id" }).catch((e) => {
        if (!String(e).includes("index_already_exists")) throw e;
      });
      await req("PATCH", `/indexes/${uid}/settings`, {
        searchableAttributes: ["title", "body", "tags"],
        filterableAttributes: ["type", "channelId", "status", "tags", "collectionIds"],
        sortableAttributes: ["updatedAt", "price"],
      });
    }
  };

  const upsertDocuments = async (locale: string, docs: KbDocument[]): Promise<void> => {
    if (!docs.length) return;
    await req("POST", `/indexes/${indexUid(locale)}/documents?primaryKey=id`, docs);
  };

  const deleteDocuments = async (locale: string, ids: string[]): Promise<void> => {
    if (!ids.length) return;
    await req("POST", `/indexes/${indexUid(locale)}/documents/delete-batch`, ids);
  };

  // 按 filter 删除（异步 task，同索引 FIFO：先删后写语义成立）。filter 需为 filterable 属性
  const deleteByFilter = async (locale: string, filter: string): Promise<void> => {
    await req("POST", `/indexes/${indexUid(locale)}/documents/delete`, { filter });
  };

  const getStats = async (): Promise<MeiliIndexStatus[]> => {
    const s = await req("GET", "/stats");
    return locales.map((locale) => {
      const uid = indexUid(locale);
      return {
        index: uid,
        documents: s.indexes?.[uid]?.numberOfDocuments ?? 0,
        healthy: true,
      };
    });
  };

  const healthCheck = async (): Promise<boolean> => {
    try {
      const body = (await (await fetch(`${host}/health`)).json()) as { status?: string };
      return body.status === "available";
    } catch {
      return false;
    }
  };

  return {
    locales,
    indexUid,
    ensureIndexes,
    upsertDocuments,
    deleteDocuments,
    deleteByFilter,
    getStats,
    healthCheck,
  };
};
