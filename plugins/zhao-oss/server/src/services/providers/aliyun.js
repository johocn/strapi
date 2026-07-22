"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AliyunOssProvider = void 0;
const ali_oss_1 = __importDefault(require("ali-oss"));
const crypto_1 = __importDefault(require("crypto"));
class AliyunOssProvider {
    constructor() {
        this.name = "aliyun";
        this.initialized = false;
    }
    async initialize(options) {
        this.options = {
            region: options.region,
            accessKeyId: options.accessKeyId,
            accessKeySecret: options.accessKeySecret,
            bucket: options.bucket,
            cname: options.cname,
            basePath: options.basePath || "uploads",
            secure: options.secure !== false,
            internalEndpoint: options.internalEndpoint,
        };
        const config = {
            region: this.options.region,
            accessKeyId: this.options.accessKeyId,
            accessKeySecret: this.options.accessKeySecret,
            bucket: this.options.bucket,
            secure: this.options.secure,
            refreshSTSTokenInterval: 300000,
        };
        if (this.options.cname) {
            config.endpoint = this.options.cname;
            config.cname = true;
        }
        else if (this.options.internalEndpoint) {
            config.endpoint = this.options.internalEndpoint;
        }
        this.client = new ali_oss_1.default(config);
        this.initialized = true;
    }
    async upload(params) {
        var _a, _b;
        this.ensureInitialized();
        const key = this.buildObjectKey(params);
        const result = await this.client.put(key, params.buffer, {
            mime: params.mimeType,
            headers: {
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
        return {
            url: this.getUrl(key),
            etag: ((_b = (_a = result.res) === null || _a === void 0 ? void 0 : _a.headers) === null || _b === void 0 ? void 0 : _b.etag) || undefined,
            provider: this.name,
        };
    }
    async delete(key) {
        this.ensureInitialized();
        await this.client.delete(key);
    }
    async checkHealth() {
        try {
            this.ensureInitialized();
            // 尝试列举文件来检查连接是否正常
            await this.client.list({
                "max-keys": 1,
            }, {});
            return true;
        }
        catch {
            return false;
        }
    }
    getUrl(key) {
        if (this.options.cname) {
            const protocol = this.options.secure ? "https" : "http";
            return `${protocol}://${this.options.cname}/${key}`;
        }
        // 使用 OSS 默认域名
        const protocol = this.options.secure ? "https" : "http";
        return `${protocol}://${this.options.bucket}.oss-${this.options.region}.aliyuncs.com/${key}`;
    }
    buildObjectKey(params) {
        const basePath = this.options.basePath || "uploads";
        const timestamp = Date.now();
        const randomStr = crypto_1.default.randomBytes(4).toString("hex");
        const ext = this.getExtension(params.filename);
        const datePath = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
        return `${basePath}/${datePath}/${timestamp}-${randomStr}${ext}`;
    }
    getExtension(filename) {
        const idx = filename.lastIndexOf(".");
        return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
    }
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error("Aliyun OSS provider not initialized. Call initialize() first.");
        }
    }
}
exports.AliyunOssProvider = AliyunOssProvider;
