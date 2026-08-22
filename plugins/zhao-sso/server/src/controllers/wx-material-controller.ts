import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const svc = () => strapi.plugin("zhao-sso").service("sso-wx-material");

  async function wrap(ctx: any, fn: () => Promise<any>) {
    try {
      ctx.body = await fn();
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message, code: (e as any).code || null };
    }
  }

  /** 从 multipart 中提取上传文件（字段 file / files / media 兼容） */
  function extractFile(ctx: any) {
    const files = ctx.request?.files;
    if (!files) return null;
    const f = files.file || files.files || files.media;
    if (!f) return null;
    return Array.isArray(f) ? f[0] : f;
  }

  return {
    /** POST /wx/materials multipart {type,name,file} → 上传永久素材并落库 */
    async create(ctx: any) {
      const body = ctx.request?.body || {};
      const file = extractFile(ctx);
      await wrap(ctx, () =>
        svc()
          .create({ type: body.type, name: body.name, remark: body.remark, file })
          .then((row: any) => ({ data: row }))
      );
    },

    async list(ctx: any) {
      await wrap(ctx, () => svc().list(ctx.query));
    },

    async delete(ctx: any) {
      await wrap(ctx, () => svc().remove(Number(ctx.params.id)).then((row: any) => ({ data: row })));
    },
  };
};