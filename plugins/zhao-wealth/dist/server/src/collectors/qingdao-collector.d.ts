import { default as BaseCollector } from './base-collector';
export default class QingdaoCollector extends BaseCollector {
    /**
     * 采集产品信息：官网列表接口 queryData.portlet 按产品代码精确查询
     * 官网仅收录在售产品；查不到（如已下架/理财网特有产品）抛错，提示改用中国理财网源
     */
    collectProductInfo(productCode: string): Promise<any>;
    /**
     * 采集净值：打开官网详情页（prdcode={代码}1），页面内 fetch queryNavData.portlet 分页取全
     * 净值行字段：nav（单位净值）、navdate（净值日期）
     */
    collectNavData(productCode: string): Promise<any[]>;
}
