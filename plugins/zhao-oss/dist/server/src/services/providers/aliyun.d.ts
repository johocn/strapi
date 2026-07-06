import { OssProvider } from './interface';
import { FileUploadParams, UploadResult } from '../../types';
export interface AliyunOssOptions {
    region: string;
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
    /** 自定义域名（可选） */
    cname?: string;
    /** 存储路径前缀（可选） */
    basePath?: string;
    /** 是否使用 HTTPS */
    secure?: boolean;
    /** 内网 Endpoint（可选，用于 ECS 内网访问） */
    internalEndpoint?: string;
}
export declare class AliyunOssProvider implements OssProvider {
    readonly name = "aliyun";
    private client;
    private options;
    private initialized;
    initialize(options: Record<string, unknown>): Promise<void>;
    upload(params: FileUploadParams): Promise<UploadResult>;
    delete(key: string): Promise<void>;
    checkHealth(): Promise<boolean>;
    getUrl(key: string): string;
    private buildObjectKey;
    private getExtension;
    private ensureInitialized;
}
