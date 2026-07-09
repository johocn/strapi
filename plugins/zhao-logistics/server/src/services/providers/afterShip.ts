import type { TrackingProvider, ProviderConfig, ExternalTrackingNode } from "./types";

/**
 * AfterShip API 适配器
 * 文档：https://developers.aftership.com/
 */
const afterShipProvider: TrackingProvider = {
  async queryTracking(providerConfig: ProviderConfig, trackingNo: string): Promise<ExternalTrackingNode[]> {
    const endpoint = providerConfig.endpoint || "https://api.aftership.com/v4/trackings";

    const response = await fetch(`${endpoint}/${trackingNo}`, {
      method: "GET",
      headers: {
        "aftership-api-key": providerConfig.apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`AfterShip API 返回 ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const nodes: ExternalTrackingNode[] = [];

    if (data?.data?.tracking?.checkpoints) {
      for (const checkpoint of data.data.tracking.checkpoints) {
        nodes.push({
          eventTime: checkpoint.checkpoint_time || new Date().toISOString(),
          location: checkpoint.location || undefined,
          description: checkpoint.message || checkpoint.tag || "",
          status: checkpoint.tag || undefined,
          providerRef: `${trackingNo}_${checkpoint.checkpoint_time || Date.now()}`,
        });
      }
    }

    return nodes;
  },
};

export default afterShipProvider;
