import { default as BaseCollector } from './base-collector';
export default class ChinawealthCollector extends BaseCollector {
    /**
     * 通过登记编码查询中国理财网
     *
     * 策略：
     * 1. 用 Playwright 打开页面 → 等待 JS 渲染
     * 2. 拦截所有 XHR/fetch 响应
     * 3. 智能定位登记编码输入框（通过 placeholder/label/索引多种方式）
     * 4. 填入登记编码 → 点击查询
     * 5. 从拦截到的 API 响应中提取产品数据
     * 6. Fallback: 从页面 DOM/文本内容提取
     */
    collectByRegisterCode(registerCode: string): Promise<any>;
    /**
     * 从 API 响应中提取产品数据
     * 兼容多种响应格式
     */
    private extractProductFromApiResponse;
    /**
     * 从页面 DOM 中提取表格数据
     * 中国理财网使用 Element UI Table，数据在 .el-table__row 中
     */
    private extractFromDom;
    /**
     * 从表格单元格数组解析产品数据
     * 中国理财网表格列顺序通常为：
     * 产品名称 | 登记编码 | 发行机构 | 产品状态 | 投资性质 | 运作模式 | 风险等级 | 期限类型
     */
    private parseTableCells;
    /**
     * 从 API 返回的产品对象中解析结构化数据
     */
    private parseApiProduct;
    /**
     * 从对象中按多个候选 key 获取值
     */
    private getFieldValue;
    /**
     * 从页面文本内容提取产品信息（Fallback）
     */
    private parseFromText;
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
