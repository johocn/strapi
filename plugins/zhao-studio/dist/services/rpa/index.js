"use strict";
// server/src/services/rpa/index.ts
// RPA 平台驱动注册表：platform → driver。
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bilibili = exports.toutiao = exports.xiaohongshu = void 0;
exports.getRpaDriver = getRpaDriver;
const xiaohongshu_1 = __importDefault(require("./xiaohongshu"));
exports.xiaohongshu = xiaohongshu_1.default;
const toutiao_1 = __importDefault(require("./toutiao"));
exports.toutiao = toutiao_1.default;
const bilibili_1 = __importDefault(require("./bilibili"));
exports.bilibili = bilibili_1.default;
const DRIVERS = { xiaohongshu: xiaohongshu_1.default, toutiao: toutiao_1.default, bilibili: bilibili_1.default };
function getRpaDriver(platform) {
    const driver = DRIVERS[platform];
    if (!driver) {
        throw new Error(`平台 ${platform} 没有 RPA 驱动实现`);
    }
    return driver;
}
__exportStar(require("./types"), exports);
//# sourceMappingURL=index.js.map