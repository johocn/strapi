"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const config = {
  default: {
    // MeiliSearch v1.11 与 vendure 侧插件共用同一实例；strapi 同机部署，运行时走内网 MEILI_HOST
    host: process.env.MEILI_HOST || "http://127.0.0.1:7700",
    adminKey: process.env.MEILI_ADMIN_KEY || "",
    indexPrefix: "kb",
    locales: ["zh", "en"]
  }
};
const isAuthorized = (ctx) => {
  const secret = process.env.ZHAO_SEARCH_SHARED_SECRET;
  return !!secret && ctx.request.headers["x-zhao-secret"] === secret;
};
const unauthorized = (ctx) => {
  ctx.status = 401;
  ctx.body = { error: "unauthorized" };
};
const adminReindex = ({ strapi }) => ({
  async reindex(ctx) {
    if (!isAuthorized(ctx)) return unauthorized(ctx);
    try {
      const contentSync2 = strapi.plugin("zhao-search").service("content-sync");
      ctx.body = await contentSync2.fullReindex();
    } catch (e) {
      ctx.status = 500;
      ctx.body = { ok: false, error: e?.message || String(e) };
    }
  },
  async health(ctx) {
    if (!isAuthorized(ctx)) return unauthorized(ctx);
    try {
      const meili2 = strapi.plugin("zhao-search").service("meili");
      const healthy = await meili2.healthCheck();
      const indexes = healthy ? await meili2.getStats() : [];
      ctx.body = { ok: true, meili: healthy, indexes };
    } catch (e) {
      ctx.body = { ok: true, meili: false, error: e?.message || String(e) };
    }
  }
});
const controllers = {
  "admin-reindex": adminReindex
};
const register = (_) => {
};
const CONTENT_MAP = {
  "plugin::zhao-website.article": {
    type: "article",
    titleField: "title",
    bodyFields: ["content"],
    publishedField: "publishedAt",
    statusField: "status",
    statusValue: "published",
    deletedField: "deletedAt",
    tagsField: "tags",
    localized: true
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
    localized: true
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
    localized: true
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
    localized: true
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
    localized: true
  }
};
const isPublishedEntry = (m, entry) => {
  if (!entry?.[m.publishedField]) return false;
  if (m.statusField && entry[m.statusField] !== m.statusValue) return false;
  if (m.deletedField && entry[m.deletedField]) return false;
  return true;
};
const stripHtml = (s) => String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5e3);
const toIndexLocale = (locale) => String(locale ?? "").toLowerCase().startsWith("zh") ? "zh" : "en";
const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  return tags.map(
    (t) => typeof t === "string" || typeof t === "number" ? String(t) : String(t?.name ?? t?.documentId ?? t?.id ?? "")
  ).filter(Boolean);
};
const toUpdatedAt = (entry) => {
  const ts = new Date(entry?.updatedAt ?? Date.now()).getTime();
  return Number.isFinite(ts) ? ts : Date.now();
};
const toDocument = (m, entry) => {
  const docId = String(entry.documentId ?? entry.id);
  const body = m.bodyFields.map((f) => stripHtml(entry[f])).filter(Boolean).join("\n").slice(0, 5e3);
  return {
    id: m.localized ? `${m.type}-${docId}-${toIndexLocale(entry.locale)}` : `${m.type}-${docId}`,
    type: m.type,
    sourceId: docId,
    sourceSystem: "strapi",
    url: `/kb/${m.type}/${docId}`,
    channelId: String(entry.tenantId ?? "0"),
    status: "published",
    tags: normalizeTags(m.tagsField ? entry[m.tagsField] : void 0),
    title: String(entry[m.titleField] ?? ""),
    body,
    updatedAt: toUpdatedAt(entry)
  };
};
const toContentDocuments = (modelUid, entry) => {
  const m = CONTENT_MAP[modelUid];
  if (!m || !isPublishedEntry(m, entry)) return [];
  const doc = toDocument(m, entry);
  if (m.localized) return [{ locale: toIndexLocale(entry.locale), doc }];
  return ["zh", "en"].map((locale) => ({ locale, doc }));
};
const documentIdsFor = (modelUid, entryId) => {
  const m = CONTENT_MAP[modelUid];
  if (!m || entryId == null) return [];
  const docId = String(entryId);
  return m.localized ? [`${m.type}-${docId}-zh`, `${m.type}-${docId}-en`] : [`${m.type}-${docId}`];
};
const WATCHED = Object.keys(CONTENT_MAP);
const extractEntryId = (event) => {
  const where = event?.params?.where ?? {};
  return where.documentId ?? where.id ?? event?.params?.documentId ?? event?.result?.documentId ?? event?.result?.id;
};
const readDocumentIdRaw = async (strapi, uid, id) => {
  try {
    const meta = strapi.db.metadata.get(uid);
    const docColumn = meta?.attributes?.documentId?.columnName || "document_id";
    const pkColumn = meta?.attributes?.id?.columnName || "id";
    const table = meta?.tableName;
    if (!table) return null;
    const row = await strapi.db.connection(table).where(pkColumn, id).first(docColumn);
    return row?.[docColumn] ?? null;
  } catch (e) {
    strapi.log.error(`[zhao-search] raw 查询异常 uid=${uid} id=${id}: ${e?.message || e}`);
    return null;
  }
};
const bootstrap = async ({ strapi }) => {
  strapi.log.info("[zhao-search] 插件已加载");
  const contentSync2 = () => strapi.plugin("zhao-search").service("content-sync");
  strapi.db.lifecycles.subscribe({
    async afterCreate(event) {
      if (!WATCHED.includes(event.model.uid)) return;
      await contentSync2().syncOne(event.model.uid, event.result);
    },
    async afterUpdate(event) {
      if (!WATCHED.includes(event.model.uid)) return;
      const entry = event.result;
      if (!entry) {
        const id = event?.params?.where?.id;
        if (id == null) return;
        const documentId = await readDocumentIdRaw(strapi, event.model.uid, id);
        if (!documentId) return;
        strapi.log.info(`[zhao-search] afterUpdate result 为空（软删过滤），按 documentId 移除索引 ${documentId}`);
        await contentSync2().removeOne(event.model.uid, documentId);
        return;
      }
      await contentSync2().syncOne(event.model.uid, entry);
    },
    async afterDelete(event) {
      if (!WATCHED.includes(event.model.uid)) return;
      await contentSync2().removeOne(event.model.uid, extractEntryId(event));
    }
  });
  strapi.log.info(`[zhao-search] 已订阅 ${WATCHED.length} 个内容类型的增量同步`);
  setImmediate(() => {
    contentSync2().fullReindex().then((result) => {
      if (result?.ok) strapi.log.info(`[zhao-search] 启动全量同步完成 ${JSON.stringify(result.counts)}`);
      else strapi.log.warn(`[zhao-search] 启动全量同步未成功 ${JSON.stringify(result)}`);
    }).catch((e) => strapi.log.warn(`[zhao-search] 启动全量同步失败（不影响启动）: ${e?.message || e}`));
  });
};
const meili = ({ strapi }) => {
  const host = strapi.config.get("plugin::zhao-search.host") || process.env.MEILI_HOST || "http://127.0.0.1:7700";
  const adminKey = strapi.config.get("plugin::zhao-search.adminKey") || process.env.MEILI_ADMIN_KEY || "";
  const indexPrefix = strapi.config.get("plugin::zhao-search.indexPrefix") || "kb";
  const locales = strapi.config.get("plugin::zhao-search.locales") || ["zh", "en"];
  const req = async (method, path, body) => {
    const res = await fetch(`${host}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${adminKey}`,
        "Content-Type": "application/json"
      },
      body: body === void 0 ? void 0 : JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Meili ${method} ${path} -> ${res.status}: ${await res.text()}`);
    return res.status === 204 ? null : res.json();
  };
  const indexUid = (locale) => `${indexPrefix}-${locale}`;
  const ensureIndexes = async () => {
    for (const locale of locales) {
      const uid = indexUid(locale);
      await req("POST", "/indexes", { uid, primaryKey: "id" }).catch((e) => {
        if (!String(e).includes("index_already_exists")) throw e;
      });
      await req("PATCH", `/indexes/${uid}/settings`, {
        searchableAttributes: ["title", "body", "tags"],
        filterableAttributes: ["type", "channelId", "status", "tags", "collectionIds"],
        sortableAttributes: ["updatedAt", "price"]
      });
    }
  };
  const upsertDocuments = async (locale, docs) => {
    if (!docs.length) return;
    await req("POST", `/indexes/${indexUid(locale)}/documents?primaryKey=id`, docs);
  };
  const deleteDocuments = async (locale, ids) => {
    if (!ids.length) return;
    await req("POST", `/indexes/${indexUid(locale)}/documents/delete-batch`, ids);
  };
  const getStats = async () => {
    const s = await req("GET", "/stats");
    return locales.map((locale) => {
      const uid = indexUid(locale);
      return {
        index: uid,
        documents: s.indexes?.[uid]?.numberOfDocuments ?? 0,
        healthy: true
      };
    });
  };
  const healthCheck = async () => {
    try {
      const body = await (await fetch(`${host}/health`)).json();
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
    getStats,
    healthCheck
  };
};
const PAGE_SIZE = 200;
const contentSync = ({ strapi }) => {
  const logError = (msg, e) => strapi.log.error(`[zhao-search] ${msg}: ${e?.message || e}`);
  const meili2 = () => strapi.plugin("zhao-search").service("meili");
  const queryWhere = (m) => {
    const where = { [m.publishedField]: { $ne: null } };
    if (m.statusField) where[m.statusField] = m.statusValue;
    if (m.deletedField) where[m.deletedField] = { $null: true };
    return where;
  };
  const syncRows = async (uid, rows) => {
    const docsByLocale = {};
    for (const row of rows) {
      for (const { locale, doc } of toContentDocuments(uid, row)) {
        (docsByLocale[locale] ||= []).push(doc);
      }
    }
    for (const [locale, docs] of Object.entries(docsByLocale)) {
      await meili2().upsertDocuments(locale, docs);
    }
  };
  const doFullReindex = async () => {
    const startedAt = Date.now();
    try {
      await meili2().ensureIndexes();
    } catch (e) {
      logError("Meili 不可用，全量同步中止", e);
      return { ok: false, error: e?.message || String(e) };
    }
    const counts = {};
    const errors = [];
    for (const [uid, m] of Object.entries(CONTENT_MAP)) {
      let offset = 0;
      let count = 0;
      try {
        for (; ; ) {
          const rows = await strapi.db.query(uid).findMany({
            where: queryWhere(m),
            populate: m.tagsField ? { [m.tagsField]: true } : void 0,
            limit: PAGE_SIZE,
            offset,
            orderBy: { id: "asc" }
          });
          await syncRows(uid, rows);
          count += rows.length;
          if (rows.length < PAGE_SIZE) break;
          offset += PAGE_SIZE;
        }
        counts[m.type] = count;
      } catch (e) {
        errors.push(`${uid}: ${e?.message || e}`);
        logError(`全量同步 ${uid} 失败`, e);
      }
    }
    return { ok: errors.length === 0, counts, errors, durationMs: Date.now() - startedAt };
  };
  const doSyncOne = async (uid, entry) => {
    if (!entry) return;
    const docs = toContentDocuments(uid, entry);
    if (docs.length) {
      for (const { locale, doc } of docs) {
        await meili2().upsertDocuments(locale, [doc]);
        strapi.log.info(`[zhao-search] 已同步 ${doc.id}`);
      }
    } else {
      await doRemoveOne(uid, entry.documentId ?? entry.id);
    }
  };
  const doRemoveOne = async (uid, entryId) => {
    if (entryId == null) return;
    const ids = documentIdsFor(uid, entryId);
    if (!ids.length) return;
    for (const locale of meili2().locales) await meili2().deleteDocuments(locale, ids);
  };
  return {
    async fullReindex() {
      return doFullReindex();
    },
    async syncOne(uid, entry) {
      try {
        await doSyncOne(uid, entry);
      } catch (e) {
        logError(`增量同步失败 ${uid}`, e);
      }
    },
    async removeOne(uid, entryId) {
      try {
        await doRemoveOne(uid, entryId);
      } catch (e) {
        logError(`索引删除失败 ${uid}`, e);
      }
    }
  };
};
const services = {
  meili,
  "content-sync": contentSync
};
const adminApi = () => ({
  type: "admin",
  prefix: "",
  routes: [
    {
      method: "POST",
      path: "/v1/zhao-search/reindex",
      handler: "admin-reindex.reindex",
      config: { auth: false, policies: [] }
    },
    {
      method: "GET",
      path: "/v1/zhao-search/health",
      handler: "admin-reindex.health",
      config: { auth: false, policies: [] }
    }
  ]
});
const routes = {
  "admin-api": adminApi
};
const index = {
  register,
  bootstrap,
  config,
  controllers,
  services,
  routes
};
exports.default = index;
