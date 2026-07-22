"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// E:\code\plugins\zhao-auth\server\src\services\jwt.service.ts
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
exports.default = ({ strapi }) => {
    function throwErr(code, status, message) {
        const e = new Error(message);
        e.code = code;
        e.status = status;
        throw e;
    }
    let cachedSecret = null;
    const getSecret = () => {
        if (cachedSecret)
            return cachedSecret;
        // 辅助函数：校验 secret 是否有效（非空字符串）
        const isValidSecret = (secret) => typeof secret === "string" && secret.trim() !== "";
        // 优先级：users-permissions 插件 > admin 配置 > 环境变量
        try {
            const apiJwt = strapi.config.get("plugin::users-permissions.jwtSecret");
            if (isValidSecret(apiJwt)) {
                cachedSecret = apiJwt;
                return cachedSecret;
            }
        }
        catch {
            // 插件未启用，忽略
        }
        try {
            const adminJwt = strapi.config.get("admin.auth.secret");
            if (isValidSecret(adminJwt)) {
                cachedSecret = adminJwt;
                return cachedSecret;
            }
        }
        catch {
            // 未配置 admin secret
        }
        const envJwt = process.env.JWT_SECRET;
        if (isValidSecret(envJwt)) {
            cachedSecret = envJwt;
            return cachedSecret;
        }
        throwErr("JWT_001", 500, "JWT secret not configured. Set JWT_SECRET env or configure users-permissions plugin.");
    };
    const refreshSecret = () => {
        cachedSecret = null;
    };
    const extractToken = (ctx) => {
        const authHeader = ctx.request?.headers?.authorization || ctx.headers?.authorization;
        if (!authHeader || typeof authHeader !== "string")
            return null;
        const parts = authHeader.split(" ");
        if (parts.length !== 2 || parts[0] !== "Bearer")
            return null;
        return parts[1];
    };
    return {
        async verify(token, secret, options) {
            const resolvedSecret = secret || getSecret();
            // async 函数会自动包装返回值/异常
            return jsonwebtoken_1.default.verify(token, resolvedSecret, options);
        },
        async sign(payload, options) {
            const secret = getSecret();
            const signOptions = { expiresIn: "30d", ...options };
            return jsonwebtoken_1.default.sign(payload, secret, signOptions);
        },
        getSecret,
        extractToken,
        refreshSecret, // 可选暴露，便于测试
    };
};
