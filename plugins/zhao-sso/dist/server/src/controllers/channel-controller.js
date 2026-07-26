"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    async track(ctx) {
        var _a;
        try {
            const body = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || ctx.request.body;
            const { channel_code, utm_source, utm_medium, utm_campaign } = body;
            if (!channel_code) {
                ctx.status = 400;
                ctx.body = { error: "channel_code 必填" };
                return;
            }
            const channelService = strapi.plugin("zhao-sso").service("sso-channel");
            const result = await channelService.trackClick(channel_code, {
                source: utm_source,
                medium: utm_medium,
                campaign: utm_campaign,
            });
            if (!result) {
                ctx.status = 404;
                ctx.body = { error: "渠道不存在" };
                return;
            }
            ctx.body = { success: true, channel: result.channel, utm: result.utm };
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
});
