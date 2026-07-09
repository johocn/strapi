import type { TrackingProvider, ProviderConfig, ExternalTrackingNode } from "./types";

/**
 * 快递100 API 适配器
 * 文档：https://api.kuaidi100.com/
 */
const kuaidi100Provider: TrackingProvider = {
  async queryTracking(providerConfig: ProviderConfig, trackingNo: string): Promise<ExternalTrackingNode[]> {
    const endpoint = providerConfig.endpoint || "https://poll.kuaidi100.com/poll/query.do";

    const params = new URLSearchParams({
      customer: providerConfig.apiKey,
      param: JSON.stringify({
        com: providerConfig.extraConfig?.com || "auto",
        num: trackingNo,
        phone: providerConfig.extraConfig?.phone || "",
      }),
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`快递100 API 返回 ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const nodes: ExternalTrackingNode[] = [];

    if (data?.data && Array.isArray(data.data)) {
      for (const item of data.data) {
        nodes.push({
          eventTime: item.ftime || new Date().toISOString(),
          location: item.location || undefined,
          description: item.context || "",
          status: item.status || undefined,
          providerRef: `${trackingNo}_${item.ftime || Date.now()}`,
        });
      }
    }

    return nodes;
  },
};

export default kuaidi100Provider;
