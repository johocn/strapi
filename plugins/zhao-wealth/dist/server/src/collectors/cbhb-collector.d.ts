import { default as BaseCollector } from './base-collector';
export default class CbhbCollector extends BaseCollector {
    /**
     * 通过销售编码采集渤银理财产品详情 — 直接调用 API
     * API: POST /eportalapply/portlet/bwmweb/queryGPro
     *
     * 字段映射：
     *   prodName  → productName
     *   saleCode  → saleCode / productCode
     *   checkInon → registerCode（登记编码）
     *   orgnoName → issuer（发行机构）
     *   riskLev   → riskLevel（"01"=R1, "02"=R2...）
     *   achievementValue → benchmark（业绩比较基准）
     *   subsBdate → issueDate（募集起始日 YYYYMMDD→YYYY-MM-DD）
     *   endDate   → maturityDate（到期日）
     *   establishDate → establishDate（成立日）
     *   gwProdCycle → 产品周期类型
     */
    collectProductInfo(productCode: string): Promise<any>;
    /**
     * 采集净值数据 — 直接调用 cbhbwm.com.cn 后端 API
     * API: POST /eportalapply/portlet/bwmweb/queryProJz
     * 无需 Playwright，纯 HTTP 请求，速度快、稳定性高
     *
     * 字段映射：value1=日期(YYYYMMDD) value2=单位净值 value3=累计净值
     */
    collectNavData(productCode: string, options?: {
        registerCode?: string;
    }): Promise<any[]>;
}
