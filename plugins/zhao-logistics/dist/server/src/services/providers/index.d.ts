import { TrackingProvider, ProviderConfig } from './types';
/**
 * 按 providerType 获取适配器
 */
export declare function getProvider(providerConfig: ProviderConfig): TrackingProvider;
export { type TrackingProvider, type ProviderConfig, type ExternalTrackingNode } from './types';
