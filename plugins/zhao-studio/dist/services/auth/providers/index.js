"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProvider = getProvider;
// server/src/services/auth/providers/index.ts
const wechat_1 = __importDefault(require("./wechat"));
const douyin_1 = __importDefault(require("./douyin"));
const xiaohongshu_1 = __importDefault(require("./xiaohongshu"));
function getProvider(strapi, platformType) {
    const providers = {
        wechat: (0, wechat_1.default)({ strapi }),
        douyin: (0, douyin_1.default)({ strapi }),
        xiaohongshu: (0, xiaohongshu_1.default)({ strapi }),
    };
    return providers[platformType] || null;
}
//# sourceMappingURL=index.js.map