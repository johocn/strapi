import { FileUploadParams, UploadResult } from '../../types';
/**
 * OSS 提供者抽象接口
 * 所有云存储服务提供商都需要实现此接口
 */
export interface OssProvider {
    /** 提供者名称标识 */
    readonly name: string;
    /** 初始化提供者 */
    initialize(options: Record<string, unknown>): Promise<void>;
    /** 上传文件 */
    upload(params: FileUploadParams): Promise<UploadResult>;
    /** 删除文件 */
    delete(key: string): Promise<void>;
    /** 检查服务健康状态 */
    checkHealth(): Promise<boolean>;
    /** 获取文件访问 URL */
    getUrl(key: string): string;
}
