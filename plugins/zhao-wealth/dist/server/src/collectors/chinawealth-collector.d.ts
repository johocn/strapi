import { default as BaseCollector } from './base-collector';
export default class ChinawealthCollector extends BaseCollector {
    /**
     * 通过登记编码查询中国理财网
     *
     * 主策略：HTTP GET + Cheerio 解析 HTML 表格
     * 兜底策略：Playwright 打开同一 URL，从 DOM 提取
     *
     * URL: /queryMenu/prodType?cpmc=&fxjg=&cpdjbm={registerCode}
     */
    collectByRegisterCode(registerCode: string): Promise<any>;
    /**
     * 主策略：HTTP GET + Cheerio 解析 HTML 表格
     */
    private collectViaHttp;
    /**
     * 用 Cheerio 解析 HTML 表格
     * 中国理财网返回服务端渲染的 HTML，包含一个 11 列的产品表格
     * 表头：序号 | 产品名称 | 登记编码 | 发行机构 | 产品状态 | 投资性质 | 运作模式 | 风险等级 | 期限类型 | 份额代码 | 份额净值 | 净值日期
     *
     * 策略：先解析表头建立列名→索引映射，再按列名提取数据（不依赖固定列位置）
     */
    private parseHtmlTable;
    /**
     * 按表头名称匹配列（推荐，抗列顺序变化）
     */
    private parseByHeader;
    /**
     * 按固定列位置解析（表头解析失败时兜底）
     * 标准布局: 序号|产品名称|登记编码|发行机构|产品状态|投资性质|运作模式|风险等级|期限类型|份额代码|份额净值|净值日期
     */
    private parseByPosition;
    /**
     * 兜底策略：Playwright 打开同一 URL，从 DOM 提取
     */
    private collectViaPlaywright;
    /**
     * 采集产品信息（兼容 BaseCollector 接口）
     */
    collectProductInfo(productCode: string): Promise<any>;
    /**
     * 采集净值数据（占位，后续按产品类型实现）
     */
    collectNavData(productCode: string): Promise<any[]>;
    private parseRiskLevel;
    private parseTermType;
    private parseProductType;
}
