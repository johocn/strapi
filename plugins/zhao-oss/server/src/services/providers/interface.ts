import type { Readable } from "stream";
import type { FileUploadParams, UploadResult } from "../../types";

/** 对象流式读取结果 */
export interface OssObjectStream {
  /** 对象内容流 */
  stream: Readable;
  /** 云端响应头（含 content-type / content-length） */
  headers: Record<string, string>;
  /** 对象字节数 */
  size?: number;
}

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

  /** 获取文件访问 URL（裸地址，不含签名，可直接入库） */
  getUrl(key: string): string;

  /** 生成带签名的临时访问 URL（私有桶场景，本地计算不发请求） */
  signUrl(key: string, expires?: number): string;

  /** 流式读取对象内容（服务端代理转发用，不产生签名地址） */
  getObjectStream(key: string): Promise<OssObjectStream>;
}
