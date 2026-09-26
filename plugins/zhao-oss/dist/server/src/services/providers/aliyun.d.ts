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
    /** 私有桶签名 URL 有效期（秒，默认 3600） */
    signedUrlExpires?: number;
}
export declare class AliyunOssProvider implements OssProvider {
    readonly name = "aliyun";
    /** 读写用 client（可走内网 endpoint） */
    private client;
    /** 出签专用 client：必须走公网域名，签名不能基于内网 endpoint 生成 */
    private signClient;
    private options;
    private initialized;
    initialize(options: Record<string, unknown>): Promise<void>;
    upload(params: FileUploadParams): Promise<UploadResult>;
    delete(key: string): Promise<void>;
    checkHealth(): Promise<boolean>;
    getUrl(key: string): string;
    /**
     * 生成带签名的临时访问 URL（私有桶场景）。
     * ali-oss 的签名在本地计算，不发网络请求，可同步返回。
     */
    signUrl(key: string, expires?: number): string;
    private buildObjectKey;
    private getExtension;
    private ensureInitialized;
}
