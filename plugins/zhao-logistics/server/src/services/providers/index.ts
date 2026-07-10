import type { TrackingProvider, ProviderConfig } from "./types";
import track17 from "./track17";
import afterShip from "./afterShip";
import kuaidi100 from "./kuaidi100";
import custom from "./custom";

const providers: Record<string, TrackingProvider> = {
  track17,
  afterShip,
  kuaidi100,
  customApi: custom,
};

/**
 * 按 providerType 获取适配器
 */
export function getProvider(providerConfig: ProviderConfig): TrackingProvider {
  const provider = providers[providerConfig.providerType];
  if (!provider) {
    throw new Error(`不支持的追踪 API 类型: ${providerConfig.providerType}`);
  }
  return provider;
}

export { type TrackingProvider, type ProviderConfig, type ExternalTrackingNode } from "./types";
