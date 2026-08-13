import { default as BaseCollector } from './base-collector';
export default class HzbankCollector extends BaseCollector {
    /**
     * 采集净值数据 — 直接 GET 静态 JSON 文件
     *
     * API: GET /eportal/hzbw/netval/{productCode}_netval.json
     * 无需认证，无需 Playwright，纯 HTTP 请求
     *
     * 字段映射：
     *   net_value_date → navDate（已是 YYYY-MM-DD 格式）
     *   unit_net_value → unitNav（单位净值）
     *   acc_net_value  → accNav（累计净值）
     *   ten_thousand_income → tenThousandIncome（万份收益，货币基金类用）
     *   seven_days_annualized_rate → sevenDayAnnualized（七日年化收益率）
     */
    collectNavData(productCode: string, options?: {
        registerCode?: string;
    }): Promise<any[]>;
    /**
     * 采集产品基本信息 — GET 静态 JSON 文件
     *
     * API: GET /eportal/hzbw/detail/{productCode}_detail.json
     *
     * 字段映射：
     *   contenttitle → productName
     *   dengjino     → registerCode（登记编码）
     *   rizengzhang  → riskLevel（风险等级，中文描述）
     *   touzileixin  → productTypeRaw（投资类型）
     *   yunzuomoshi  → operationMode（运作模式）
     *   licaiqixian  → termInfo（理财期限）
     *   chengliriqi  → establishDate（成立日期）
     *   jieshuriqi   → maturityDate（结束日期）
     *   danweijingzhi → unitNetValue（当前单位净值）
     *   leijijingzhi → accNetValue（当前累计净值）
     *   seven_days_annualized_rate → sevenDayAnnualized
     *   ten_thousand_income → tenThousandIncome
     */
    collectProductInfo(productCode: string): Promise<any>;
    /**
     * 解析风险等级
     * 按关键词长度降序检查，避免"低风险"匹配到"中低风险"的子串
     */
    private parseRiskLevel;
}
