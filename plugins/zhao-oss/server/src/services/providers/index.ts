import type { OssProvider } from "./interface";
import { AliyunOssProvider } from "./aliyun";

/** 提供者构造函数映射 */
const PROVIDER_CLASSES: Record<
  string,
  new () => OssProvider
> = {
  aliyun: AliyunOssProvider,
};

/** 获取提供者实例 */
export function createProvider(type: string): OssProvider {
  const ProviderClass = PROVIDER_CLASSES[type];
  if (!ProviderClass) {
    throw new Error(`Unsupported OSS provider type: "${type}". Available: ${Object.keys(PROVIDER_CLASSES).join(", ")}`);
  }
  return new ProviderClass();
}

/** 注册自定义提供者 */
export function registerProvider(type: string, providerClass: new () => OssProvider): void {
  PROVIDER_CLASSES[type] = providerClass;
}

/** 获取所有已注册的提供者类型 */
export function getRegisteredProviders(): string[] {
  return Object.keys(PROVIDER_CLASSES);
}

export type { OssProvider } from "./interface";
export { AliyunOssProvider } from "./aliyun";
