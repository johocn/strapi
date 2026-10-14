import type { Core } from "@strapi/strapi";

// Task 8 填充：fullReindex / syncOne / removeOne（内容映射 + lifecycle 增量 + 启动全量）
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async fullReindex() {
    strapi.log.warn("[zhao-search] fullReindex 尚未实现（Task 8）");
    return { ok: false, error: "not_implemented" };
  },

  async syncOne(_uid: string, _entry: any) {
    // Task 8 实现
  },

  async removeOne(_uid: string, _entryId: any) {
    // Task 8 实现
  },
});
