import { default as BaseCollector } from './base-collector';
/**
 * 宁银理财采集器
 *
 * API 侦查结论（joho 实测）：
 *   官网 /ningbo-web/product/*.json 接口被 nginx WAF 按 TLS 指纹拦截（curl/Node fetch 均 403），
 *   必须 Playwright 真实浏览器会话内 fetch 同源请求。
 *   1. list.json?projectcode=  → 产品信息（登记编码在 id 字段，风险等级 risklevelDesc）
 *   2. funddaytable.json      → 净值分页表 { cdate(ms), netvalue, totalnetvalue, incomeratio }
 *      incomeratio 为近 7 日年化口径（与净值反算吻合），随净值入库为 annualYield
 *   3. 主源失败自动切中国理财网兜底（按登记编码，需调用方传入 registerCode）
 */
export default class NingyinCollector extends BaseCollector {
    /**
     * 采集产品基本信息 — Playwright 会话内 fetch list.json
     * 提取不到结构化信息时返回 null（提示走中国理财网补录登记编码）
     */
    collectProductInfo(productCode: string): Promise<any>;
    /**
     * 采集净值数据 — 官网 funddaytable 翻页拉全量，失败自动切中国理财网兜底
     * 字段映射：cdate(ms)→navDate、netvalue→unitNav、totalnetvalue→accNav、incomeratio→annualYield
     */
    collectNavData(productCode: string, options?: {
        registerCode?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<any[]>;
    private collectViaOfficial;
    private collectViaChinawealth;
}
