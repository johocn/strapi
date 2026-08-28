import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const svc = () => strapi.plugin("zhao-sso").service("sso-wx-qrcode");

  async function wrap(ctx: any, fn: () => Promise<any>) {
    try {
      ctx.body = await fn();
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message, code: (e as any).code || null };
    }
  }

  return {
    /** 生成带参二维码 */
    async create(ctx: any) {
      await wrap(ctx, () => svc().create(ctx.request.body || {}).then((row: any) => ({ data: row })));
    },

    /** 二维码列表 */
    async list(ctx: any) {
      await wrap(ctx, () => svc().list(ctx.query));
    },

    async findOne(ctx: any) {
      await wrap(ctx, () => svc().findOne(Number(ctx.params.id)).then((row: any) => ({ data: row })));
    },

    /**
     * C 端公开：按 scene 取或建带参二维码，返回 { wx_url }。
     * 未配置公众号/接口异常时返回 { wx_url: null }，前端据此跳过关注引导步，不阻塞报名。
     */
    async getQrcode(ctx: any) {
      const scene = String(ctx.query.scene || "").trim();
      if (!scene) {
        ctx.status = 400;
        ctx.body = { error: "scene 参数必填" };
        return;
      }
      try {
        let row = await svc().findBySceneKey(scene);
        if (!row) {
          row = await svc().create({ scene_key: scene, title: scene, kind: "temporary" });
        }
        ctx.body = { data: { wx_url: row?.wx_url || null } };
      } catch (e: any) {
        strapi.log.warn(`[zhao-sso] getQrcode(${scene}) failed: ${e?.message}`);
        ctx.body = { data: { wx_url: null } };
      }
    },

    async delete(ctx: any) {
      await wrap(ctx, () => svc().remove(Number(ctx.params.id)).then((row: any) => ({ data: row })));
    },

    /** 事件日志查询 */
    async events(ctx: any) {
      await wrap(ctx, () => svc().events(ctx.query));
    },
  };
};