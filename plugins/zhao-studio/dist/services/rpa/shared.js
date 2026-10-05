"use strict";
// server/src/services/rpa/shared.ts
// RPA 驱动公共工具：步骤包装、失败取证、远程图片转上传载荷。
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.step = step;
exports.dumpDebug = dumpDebug;
exports.toUploadPayload = toUploadPayload;
exports.isLocalPath = isLocalPath;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
/**
 * 把一段交互包成具名步骤。失败时抛出的错误带步骤前缀，便于定位是「哪一步选择器没命中」。
 */
async function step(name, fn) {
    try {
        return await fn();
    }
    catch (err) {
        throw new Error(`[RPA step:${name}] ${err?.message || err}`);
    }
}
/**
 * 发布失败时落盘截图 + DOM，供后续在真实浏览器调试选择器时对照。
 * 目录：<os.tmpdir()>/zhao-rpa-debug。绝不抛异常。
 */
async function dumpDebug(page, platform, label) {
    try {
        const dir = path.join(os.tmpdir(), 'zhao-rpa-debug');
        fs.mkdirSync(dir, { recursive: true });
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const base = path.join(dir, `${platform}-${label}-${stamp}`);
        await page.screenshot({ path: `${base}.png`, fullPage: true });
        const html = await page.content();
        fs.writeFileSync(`${base}.html`, html, 'utf-8');
        return `${base}.png`;
    }
    catch {
        return undefined;
    }
}
/**
 * 远程图片 → Playwright setInputFiles 可接受的 { name, mimeType, buffer } 载荷。
 * 本地的 http(s) 之外的路径（file:// 或相对路径）直接交给 Playwright。
 */
async function toUploadPayload(src) {
    const resp = await axios_1.default.get(src, { responseType: 'arraybuffer', timeout: 30000 });
    const rawType = resp.headers['content-type'];
    const mimeType = (typeof rawType === 'string' ? rawType.split(';')[0] : '') || 'image/jpeg';
    const ext = mimeType.split('/')[1] || 'jpg';
    const name = `rpa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    return { name, mimeType, buffer: Buffer.from(resp.data) };
}
/** 判断是否为可直接交给 Playwright 的本地路径 */
function isLocalPath(src) {
    return !/^https?:\/\//i.test(src);
}
//# sourceMappingURL=shared.js.map