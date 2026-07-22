"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    default: {
        // 认证中间件默认配置
        authenticate: {
            publicPaths: [],
        },
        // 授权中间件默认配置
        authorize: {
            policies: [],
        },
    },
    validator: (config) => {
        // 简单的配置验证
        if (config.authenticate && typeof config.authenticate !== "object") {
            throw new Error("authenticate 配置必须是对象");
        }
        if (config.authorize && typeof config.authorize !== "object") {
            throw new Error("authorize 配置必须是对象");
        }
    },
};
