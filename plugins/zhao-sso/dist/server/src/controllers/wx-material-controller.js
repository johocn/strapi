"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => {
    const svc = () => strapi.plugin("zhao-sso").service("sso-wx-material");
    async function wrap(ctx, fn) {
        try {
            ctx.body = await fn();
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message, code: e.code || null };
        }
    }
    /** 从 multipart 中提取上传文件（字段 file / files / media 兼容） */
    function extractFile(ctx) {
        var _a;
        const files = (_a = ctx.request) === null || _a === void 0 ? void 0 : _a.files;
        if (!files)
            return null;
        const f = files.file || files.files || files.media;
        if (!f)
            return null;
        return Array.isArray(f) ? f[0] : f;
    }
    return {
        /** POST /wx/materials multipart {type,name,file} → 上传永久素材并落库 */
        async create(ctx) {
            var _a;
            const body = ((_a = ctx.request) === null || _a === void 0 ? void 0 : _a.body) || {};
            const file = extractFile(ctx);
            await wrap(ctx, () => svc()
                .create({ type: body.type, name: body.name, remark: body.remark, file })
                .then((row) => ({ data: row })));
        },
        async list(ctx) {
            await wrap(ctx, () => svc().list(ctx.query));
        },
        async delete(ctx) {
            await wrap(ctx, () => svc().remove(Number(ctx.params.id)).then((row) => ({ data: row })));
        },
        /** POST /wx/materials/sync {type} → 从微信永久素材库拉取并落库 */
        async sync(ctx) {
            var _a;
            const body = ((_a = ctx.request) === null || _a === void 0 ? void 0 : _a.body) || {};
            await wrap(ctx, () => svc().syncFromWechat(body.type).then((r) => ({ data: r })));
        },
    };
};
//# sourceMappingURL=wx-material-controller.js.map