import { OssProvider } from './interface';
/** 获取提供者实例 */
export declare function createProvider(type: string): OssProvider;
/** 注册自定义提供者 */
export declare function registerProvider(type: string, providerClass: new () => OssProvider): void;
/** 获取所有已注册的提供者类型 */
export declare function getRegisteredProviders(): string[];
export type { OssProvider } from './interface';
export { AliyunOssProvider } from './aliyun';
