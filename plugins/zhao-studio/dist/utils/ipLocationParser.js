"use strict";
// server/src/utils/ipLocationParser.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseIpLocation = parseIpLocation;
exports.extractReferrerDomain = extractReferrerDomain;
const axios_1 = __importDefault(require("axios"));
// 使用免费的 IP 地理位置服务(可替换为付费服务)
const IP_API_URL = 'http://ip-api.com/json/';
async function parseIpLocation(ip) {
    const result = {
        country: '',
        city: '',
    };
    if (!ip || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
        // 本地或内网IP,返回空
        return result;
    }
    try {
        const response = await axios_1.default.get(`${IP_API_URL}${ip}`, {
            timeout: 5000,
        });
        if (response.data && response.data.status === 'success') {
            result.country = response.data.country || '';
            result.city = response.data.city || '';
        }
    }
    catch (error) {
        // 解析失败,返回空,不阻塞上报
    }
    return result;
}
// 提取 referrer 域名
function extractReferrerDomain(referrer) {
    if (!referrer) {
        return '';
    }
    try {
        const url = new URL(referrer);
        return url.hostname || '';
    }
    catch {
        return '';
    }
}
//# sourceMappingURL=ipLocationParser.js.map