import type { TrackingProvider, ProviderConfig, ExternalTrackingNode } from "./types";

/**
 * 自定义 API 适配器
 * 通用 HTTP 调用，按 extraConfig 中的字段映射解析响应
 */
const customProvider: TrackingProvider = {
  async queryTracking(providerConfig: ProviderConfig, trackingNo: string): Promise<ExternalTrackingNode[]> {
    if (!providerConfig.endpoint) {
      throw new Error("自定义追踪 API 需配置 endpoint");
    }

    const extraConfig = providerConfig.extraConfig || {};
    const method = extraConfig.method || "GET";
    const headers = extraConfig.headers || { "Content-Type": "application/json" };

    let url = providerConfig.endpoint;
    let body: string | undefined;

    if (method === "GET") {
      url += `?trackingNo=${encodeURIComponent(trackingNo)}`;
    } else {
      body = JSON.stringify({ trackingNo, ...(extraConfig.body || {}) });
    }

    const response = await fetch(url, {
      method,
      headers: { ...headers, Authorization: `Bearer ${providerConfig.apiKey}` },
      body,
    });

    if (!response.ok) {
      throw new Error(`自定义追踪 API 返回 ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const nodes: ExternalTrackingNode[] = [];

    // 按 extraConfig.fieldMapping 解析响应
    const dataPath = extraConfig.dataPath || "data";
    const items = dataPath.split(".").reduce((obj, key) => obj?.[key], data) || [];
    const fieldMapping = extraConfig.fieldMapping || {};

    for (const item of items) {
      nodes.push({
        eventTime: item[fieldMapping.eventTime || "eventTime"] || new Date().toISOString(),
        location: item[fieldMapping.location || "location"] || undefined,
        description: item[fieldMapping.description || "description"] || "",
        status: item[fieldMapping.status || "status"] || undefined,
        providerRef: item[fieldMapping.providerRef || "providerRef"] || `${trackingNo}_${Date.now()}`,
      });
    }

    return nodes;
  },
};

export default customProvider;
