import { Core } from '@strapi/strapi';
/**
 * 追踪查询结果
 */
export interface TrackingResult {
    shipment: any;
    nodes: any[];
    isAlert: boolean;
    alertNodes: any[];
}
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 查询运单轨迹（内部 + 外部合并）
     * 1. 查 tracking-shipment
     * 2. 查 tracking-node（internal 源）
     * 3. 若 shipment.syncProvider 存在，调用外部 API
     * 4. 合并节点，按 eventTime 排序
     * 5. 检测异常状态（hold/exception 节点）
     * 6. 返回 {shipment, nodes, isAlert, alertNodes}
     */
    getTracking(siteId: number, trackingNo: string): Promise<TrackingResult | null>;
    /**
     * 批量查询（最多 10 单）
     */
    batchTracking(siteId: number, trackingNos: string[]): Promise<TrackingResult[]>;
    /**
     * 从外部 API 同步运单轨迹
     * 1. 加载 tracking-provider 配置
     * 2. 调用外部 API（按 providerType 分发）
     * 3. 增量写入 tracking-node（dataSource=external，去重 providerRef）
     * 4. 更新 shipment.lastSyncAt + status
     */
    syncFromProvider(siteId: number, trackingNo: string): Promise<void>;
};
export default _default;
