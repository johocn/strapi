"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => {
    const svc = () => strapi.plugin("zhao-sso").service("sso-wx-qrcode");
    async function wrap(ctx, fn) {
        try {
            ctx.body = await fn();
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message, code: e.code || null };
        }
    }
    return {
        /** 生成带参二维码 */
        async create(ctx) {
            await wrap(ctx, () => svc().create(ctx.request.body || {}).then((row) => ({ data: row })));
        },
        /** 二维码列表 */
        async list(ctx) {
            await wrap(ctx, () => svc().list(ctx.query));
        },
        async findOne(ctx) {
            await wrap(ctx, () => svc().findOne(Number(ctx.params.id)).then((row) => ({ data: row })));
        },
        /**
         * C 端公开：按 scene 取或建带参二维码，返回 { wx_url }。
         * 未配置公众号/接口异常时返回 { wx_url: null }，前端据此跳过关注引导步，不阻塞报名。
         */
        async getQrcode(ctx) {
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
                ctx.body = { data: { wx_url: (row === null || row === void 0 ? void 0 : row.wx_url) || null } };
            }
            catch (e) {
                strapi.log.warn(`[zhao-sso] getQrcode(${scene}) failed: ${e === null || e === void 0 ? void 0 : e.message}`);
                ctx.body = { data: { wx_url: null } };
            }
        },
        async delete(ctx) {
            await wrap(ctx, () => svc().remove(Number(ctx.params.id)).then((row) => ({ data: row })));
        },
        /** 事件日志查询 */
        async events(ctx) {
            await wrap(ctx, () => svc().events(ctx.query));
        },
    };
};
//# sourceMappingURL=wx-qrcode-controller.js.map