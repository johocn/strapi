/** OSS 提供者配置 */
export interface OssProviderConfig {
    /** 提供者唯一标识 */
    name: string;
    /** 提供者显示名称 */
    displayName: string;
    /** 是否启用 */
    enabled: boolean;
    /** 是否为当前主提供者 */
    primary: boolean;
    /** 提供者特定配置 */
    options: Record<string, unknown>;
}
/** 上传结果 */
export interface UploadResult {
    /** 云端 URL */
    url: string;
    /** ETag/文件哈希 */
    etag?: string;
    /** 提供者名称 */
    provider: string;
}
/** 文件上传参数 */
export interface FileUploadParams {
    /** 文件缓冲区 */
    buffer: Buffer;
    /** 文件名 */
    filename: string;
    /** MIME 类型 */
    mimeType: string;
    /** 文件大小（字节） */
    fileSize: number;
    /** 存储路径（可选） */
    path?: string;
}
/** 同步记录状态 */
export declare enum SyncStatus {
    PENDING = "pending",
    SYNCING = "syncing",
    SUCCESS = "success",
    FAILED = "failed",
    SKIPPED = "skipped"
}
/** 同步记录 */
export interface SyncRecord {
    id: number;
    /** 关联的 upload file ID */
    fileId: number;
    /** 文件哈希（用于一致性校验） */
    fileHash: string;
    /** 同步状态 */
    status: SyncStatus;
    /** 使用的提供者 */
    provider: string;
    /** 云端 URL */
    remoteUrl?: string;
    /** 云端 ETag */
    remoteEtag?: string;
    /** 错误信息 */
    errorMessage?: string;
    /** 重试次数 */
    retryCount: number;
    /** 最后同步时间 */
    lastSyncedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
/** 插件配置 */
export interface PluginConfig {
    /** 是否启用 OSS 备份 */
    enabled: boolean;
    /** 上传超时时间（毫秒） */
    uploadTimeoutMs: number;
    /** 最大重试次数 */
    maxRetries: number;
    /** 健康检查间隔（毫秒） */
    healthCheckIntervalMs: number;
    /** 是否在删除本地文件时同步删除云端文件 */
    syncDelete: boolean;
    /** 备用模式 - 当 OSS 不可用时回退到本地 */
    fallbackToLocal: boolean;
    /** 是否启用 URL 自动重写（查询时将本地 URL 替换为 OSS URL） */
    enableUrlRewrite: boolean;
    /** OSS 提供者配置列表 */
    providers: OssProviderConfig[];
}
