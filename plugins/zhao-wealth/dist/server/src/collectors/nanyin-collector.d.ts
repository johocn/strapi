import { default as BaseCollector } from './base-collector';
/**
 * 南银理财采集器
 *
 * API 侦查结论：
 *   净值接口为 RSA/AES 双层加密（Node crypto 原生实现，零新依赖）：
 *   1. GET publicKey.portlet 获取 RSA 公钥（格式不定，兼容 PKCS1/SPKI/base64 解析）
 *   2. 生成随机 16 字节 AES key → AES-128-ECB 加密请求体 data/timeStamp，RSA 加密 aesKey
 *   3. POST queryNetValueList.portlet（Referer/Origin/浏览器 UA）
 *   4. 响应 data.data 为 AES 密文，解密得 { aaData, totalCount, currentPage }
 *   5. 按 currentPage 翻页拉全量；失败（含 502）自动切 Playwright 会话内同源 fetch 兜底
 *
 * 产品信息无公开结构化接口 → 走中国理财网补录（登记编码 Z7003225000398）
 */
export default class NanyinCollector extends BaseCollector {
    /**
     * 采集产品基本信息 — Playwright 打开净值页从 DOM 提取
     * 提取不到结构化信息时返回 null，提示走中国理财网补录
     */
    collectProductInfo(productCode: string): Promise<any>;
    /**
     * 采集净值数据 — RSA/AES 双层加密接口
     *
     * 链路：公钥 → 随机 AES key → 加密请求体（data/timeStamp/AES，aesKey/RSA）
     *       → POST 翻页 → 解密 data.data → aaData 映射 → 过滤排序
     * 字段映射：date→navDate、netValue→unitNav、cumulativeNetValue→accNav（缺省回退 unitNav）
     */
    collectNavData(productCode: string, options?: {
        registerCode?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<any[]>;
    /**
     * POST 净值接口 — httpClient 优先，502/非 2xx 切 Playwright 会话兜底
     */
    private postNavQuery;
    /**
     * Playwright 兜底：页面会话内同源 fetch（自动携带 Cookie）
     * 请求体仍为 Node 端已加密的 JSON 字符串，解密仍在 Node 端完成
     */
    private postNavQueryViaPlaywright;
}
