"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const policies_1 = __importDefault(require("./policies"));
const register = ({ strapi }) => {
    // 服务通过 services/index.ts 自动注册，无需手动实例化
    // 注册策略到 Strapi 策略注册表
    const policyRegistry = strapi.get("policies");
    policyRegistry.add("plugin::zhao-auth", policies_1.default);
    strapi.log.info("[zhao-auth] 策略已注册");
};
exports.default = register;
