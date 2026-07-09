import type { Core } from "@strapi/strapi";
import { getProvider, type ProviderConfig, type ExternalTrackingNode } from "./providers";

const SHIPMENT_UID = "plugin::zhao-logistics.tracking-shipment";
const NODE_UID = "plugin::zhao-logistics.tracking-node";
const PROVIDER_UID = "plugin::zhao-logistics.tracking-provider";

/**
 * 追踪查询结果
 */
export interface TrackingResult {
  shipment: any;
  nodes: any[];
  isAlert: boolean;
  alertNodes: any[];
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 查询运单轨迹（内部 + 外部合并）
   * 1. 查 tracking-shipment
   * 2. 查 tracking-node（internal 源）
   * 3. 若 shipment.syncProvider 存在，调用外部 API
   * 4. 合并节点，按 eventTime 排序
   * 5. 检测异常状态（hold/exception 节点）
   * 6. 返回 {shipment, nodes, isAlert, alertNodes}
   */
  async getTracking(siteId: number, trackingNo: string): Promise<TrackingResult | null> {
    // 1. 查询运单
    const shipment = await strapi.db.query(SHIPMENT_UID).findOne({
      where: { site: siteId, trackingNo, deletedAt: null },
      populate: { syncProvider: true },
    });

    if (!shipment) return null;

    // 2. 查询内部节点
    const internalNodes = await strapi.db.query(NODE_UID).findMany({
      where: { site: siteId, shipment: shipment.id, deletedAt: null },
      orderBy: { eventTime: "desc" },
    });

    let allNodes = [...internalNodes];

    // 3. 若有外部追踪源，合并外部节点
    if (shipment.syncProvider && shipment.syncProvider.isEnabled) {
      const externalNodes = await strapi.db.query(NODE_UID).findMany({
        where: { site: siteId, shipment: shipment.id, dataSource: "external", deletedAt: null },
        orderBy: { eventTime: "desc" },
      });
      allNodes = [...allNodes, ...externalNodes];
    }

    // 4. 按 eventTime 降序排序
    allNodes.sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime());

    // 5. 检测异常状态
    const alertStatuses = ["hold", "exception", "returned"];
    const alertNodes = allNodes.filter((n) => alertStatuses.includes(n.status));
    const isAlert = alertNodes.length > 0;

    return {
      shipment,
      nodes: allNodes,
      isAlert,
      alertNodes,
    };
  },

  /**
   * 批量查询（最多 10 单）
   */
  async batchTracking(siteId: number, trackingNos: string[]): Promise<TrackingResult[]> {
    if (trackingNos.length > 10) {
      throw new Error("批量查询最多 10 单");
    }

    const results: TrackingResult[] = [];
    for (const trackingNo of trackingNos) {
      const result = await this.getTracking(siteId, trackingNo);
      if (result) results.push(result);
    }
    return results;
  },

  /**
   * 从外部 API 同步运单轨迹
   * 1. 加载 tracking-provider 配置
   * 2. 调用外部 API（按 providerType 分发）
   * 3. 增量写入 tracking-node（dataSource=external，去重 providerRef）
   * 4. 更新 shipment.lastSyncAt + status
   */
  async syncFromProvider(siteId: number, trackingNo: string): Promise<void> {
    // 1. 查询运单 + 追踪源配置
    const shipment = await strapi.db.query(SHIPMENT_UID).findOne({
      where: { site: siteId, trackingNo, deletedAt: null },
      populate: { syncProvider: true },
    });

    if (!shipment) throw new Error(`运单不存在: ${trackingNo}`);
    if (!shipment.syncProvider || !shipment.syncProvider.isEnabled) {
      throw new Error(`运单 ${trackingNo} 未配置外部追踪源或已禁用`);
    }

    const providerConfig: ProviderConfig = {
      providerType: shipment.syncProvider.providerType,
      apiKey: shipment.syncProvider.apiKey,
      apiSecret: shipment.syncProvider.apiSecret || undefined,
      endpoint: shipment.syncProvider.endpoint || undefined,
      extraConfig: shipment.syncProvider.extraConfig || undefined,
    };

    // 2. 调用外部 API
    const provider = getProvider(providerConfig);
    const externalNodes: ExternalTrackingNode[] = await provider.queryTracking(providerConfig, trackingNo);

    // 3. 增量写入（去重 providerRef）
    let newCount = 0;
    for (const node of externalNodes) {
      if (!node.providerRef) continue;

      // 检查是否已存在
      const existing = await strapi.db.query(NODE_UID).findOne({
        where: { site: siteId, shipment: shipment.id, providerRef: node.providerRef, deletedAt: null },
      });

      if (!existing) {
        await strapi.db.query(NODE_UID).create({
          data: {
            site: siteId,
            shipment: shipment.id,
            trackingNo,
            eventTime: node.eventTime,
            location: node.location || "",
            description: node.description,
            status: node.status || "info",
            dataSource: "external",
            providerRef: node.providerRef,
            providerName: providerConfig.providerType,
          },
        });
        newCount++;
      }
    }

    // 4. 更新运单同步时间 + 状态
    const latestNode = externalNodes[0];
    const statusMap: Record<string, string> = {
      delivered: "delivered",
      exception: "exception",
      hold: "hold",
      in_transit: "in_transit",
      customs: "customs",
      returned: "returned",
    };

    const updateData: any = {
      lastSyncAt: new Date().toISOString(),
    };

    if (latestNode?.status && statusMap[latestNode.status]) {
      updateData.status = statusMap[latestNode.status];
    }

    await strapi.db.query(SHIPMENT_UID).update({
      where: { site: siteId, documentId: shipment.documentId },
      data: updateData,
    });

    strapi.log.info(`[tracking-aggregator] ${trackingNo} 同步完成，新增 ${newCount} 条节点`);
  },
});
