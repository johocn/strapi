"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const bootstrap = async ({ strapi }) => {
    strapi.log.info("[zhao-sso] Plugin bootstrapped");
    const defaultApp = await strapi.db.query("plugin::zhao-sso.sso-app").findOne({
        where: { app_code: "default" },
    });
    if (!defaultApp) {
        // 从环境变量读取默认密钥,未配置时跳过创建(避免硬编码密钥上生产)
        const rawSecret = process.env.SSO_DEFAULT_APP_SECRET;
        if (!rawSecret) {
            strapi.log.warn("[zhao-sso] SSO_DEFAULT_APP_SECRET 未配置,跳过默认应用创建(请在 .env 中设置)");
            return;
        }
        await strapi.db.query("plugin::zhao-sso.sso-app").create({
            data: {
                app_code: "default",
                app_name: "默认应用",
                app_secret: await bcryptjs_1.default.hash(rawSecret, 10),
                redirect_uris: ["http://localhost:*"],
                allowed_grant_types: ["authorization_code", "refresh_token"],
                is_active: true,
            },
        });
        strapi.log.info("[zhao-sso] Default app created (app_code=default)");
    }
};
exports.default = bootstrap;
