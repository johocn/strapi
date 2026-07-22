"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AliyunOssProvider = void 0;
exports.createProvider = createProvider;
exports.registerProvider = registerProvider;
exports.getRegisteredProviders = getRegisteredProviders;
const aliyun_1 = require("./aliyun");
/** 提供者构造函数映射 */
const PROVIDER_CLASSES = {
    aliyun: aliyun_1.AliyunOssProvider,
};
/** 获取提供者实例 */
function createProvider(type) {
    const ProviderClass = PROVIDER_CLASSES[type];
    if (!ProviderClass) {
        throw new Error(`Unsupported OSS provider type: "${type}". Available: ${Object.keys(PROVIDER_CLASSES).join(", ")}`);
    }
    return new ProviderClass();
}
/** 注册自定义提供者 */
function registerProvider(type, providerClass) {
    PROVIDER_CLASSES[type] = providerClass;
}
/** 获取所有已注册的提供者类型 */
function getRegisteredProviders() {
    return Object.keys(PROVIDER_CLASSES);
}
var aliyun_2 = require("./aliyun");
Object.defineProperty(exports, "AliyunOssProvider", { enumerable: true, get: function () { return aliyun_2.AliyunOssProvider; } });
