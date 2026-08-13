import { default as BaseCollector } from './base-collector';
export default class ChinawealthCollector extends BaseCollector {
    /**
     * 通过登记编码查询中国理财网产品详情页
     *
     * URL: /queryMenu/prodType/prodTypeDetail?prodRegCode={registerCode}
     * 页面为 Vue SPA（Element Plus），需 Playwright 渲染后从 DOM 提取
     */
    collectByRegisterCode(registerCode: string): Promise<any>;
    /**
     * Playwright 策略：打开详情页，精确 DOM 定位提取字段
     *
     * .basic-info 中每个字段结构：
     *   <div class="el-col el-col-10">标签</div>
     *   <div class="el-col el-col-14">值</div>
     * 通过精确匹配标签文本，取下一个兄弟元素的文本作为值
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
    private parseProductType;
}
