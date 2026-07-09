import type { TrackingProvider, ProviderConfig, ExternalTrackingNode } from "./types";

/**
 * 17Track API 适配器
 * 文档：https://api.17track.net/
 */
const track17Provider: TrackingProvider = {
  async queryTracking(providerConfig: ProviderConfig, trackingNo: string): Promise<ExternalTrackingNode[]> {
    const endpoint = providerConfig.endpoint || "https://api.17track.net/track/v2.2/gettrackinfo";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "17token": providerConfig.apiKey,
      },
      body: JSON.stringify({ data: [{ number: trackingNo }] }),
    });

    if (!response.ok) {
      throw new Error(`17Track API 返回 ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const nodes: ExternalTrackingNode[] = [];

    if (data?.data?.accepted && data.data.accepted.length > 0) {
      const trackInfo = data.data.accepted[0];
      if (trackInfo?.track?.z0) {
        for (const event of trackInfo.track.z0) {
          nodes.push({
            eventTime: event.z ? new Date(Number(event.z)).toISOString() : new Date().toISOString(),
            location: event.c || undefined,
            description: event.z1 || event.b || "",
            status: event.a || undefined,
            providerRef: `${trackingNo}_${event.z || Date.now()}`,
          });
        }
      }
    }

    return nodes;
  },
};

export default track17Provider;
