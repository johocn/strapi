/**
 * 外部追踪 API 适配器接口（strategy 模式）
 */
export interface TrackingProvider {
  /**
   * 查询运单轨迹
   */
  queryTracking(providerConfig: ProviderConfig, trackingNo: string): Promise<ExternalTrackingNode[]>;
}

/**
 * 追踪 API 配置（来自 tracking-provider CT）
 */
export interface ProviderConfig {
  providerType: "17track" | "afterShip" | "kuaidi100" | "custom_api";
  apiKey: string;
  apiSecret?: string;
  endpoint?: string;
  extraConfig?: Record<string, any>;
}

/**
 * 外部追踪节点（来自第三方 API）
 */
export interface ExternalTrackingNode {
  eventTime: string;
  location?: string;
  description: string;
  status?: string;
  providerRef?: string;
}
