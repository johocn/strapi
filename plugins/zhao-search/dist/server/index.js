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
const bootstrap = async ({ strapi }) => {
  strapi.log.info("[zhao-search] 插件已加载");
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
const contentSync = ({ strapi }) => ({
  async fullReindex() {
    strapi.log.warn("[zhao-search] fullReindex 尚未实现（Task 8）");
    return { ok: false, error: "not_implemented" };
  },
  async syncOne(_uid, _entry) {
  },
  async removeOne(_uid, _entryId) {
  }
});
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
