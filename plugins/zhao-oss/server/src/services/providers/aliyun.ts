import OSS from "ali-oss";
import crypto from "crypto";
import type { OssProvider, OssObjectStream } from "./interface";
import type { FileUploadParams, UploadResult } from "../../types";

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

export class AliyunOssProvider implements OssProvider {
  readonly name = "aliyun";
  /** 读写用 client（可走内网 endpoint） */
  private client!: OSS;
  /** 出签专用 client：必须走公网域名，签名不能基于内网 endpoint 生成 */
  private signClient!: OSS;
  private options!: AliyunOssOptions;
  private initialized = false;

  async initialize(options: Record<string, unknown>): Promise<void> {
    this.options = {
      region: options.region as string,
      accessKeyId: options.accessKeyId as string,
      accessKeySecret: options.accessKeySecret as string,
      bucket: options.bucket as string,
      cname: options.cname as string,
      basePath: (options.basePath as string) || "uploads",
      secure: options.secure !== false,
      internalEndpoint: options.internalEndpoint as string,
      signedUrlExpires: Number(options.signedUrlExpires) || 3600,
    };

    const baseConfig: OSS.Options = {
      region: this.options.region,
      accessKeyId: this.options.accessKeyId,
      accessKeySecret: this.options.accessKeySecret,
      bucket: this.options.bucket,
      secure: this.options.secure,
    };

    const config: OSS.Options = { ...baseConfig, refreshSTSTokenInterval: 300000 };

    if (this.options.cname) {
      config.endpoint = this.options.cname;
      config.cname = true;
    } else if (this.options.internalEndpoint) {
      config.endpoint = this.options.internalEndpoint;
    }

    this.client = new OSS(config);

    // 签名 client 不带 internalEndpoint：否则签出的地址是内网域名，浏览器无法访问
    const signConfig: OSS.Options = { ...baseConfig };
    if (this.options.cname) {
      signConfig.endpoint = this.options.cname;
      signConfig.cname = true;
    }
    this.signClient = new OSS(signConfig);

    this.initialized = true;
  }

  async upload(params: FileUploadParams): Promise<UploadResult> {
    this.ensureInitialized();

    const key = this.buildObjectKey(params);
    const result = await this.client.put(key, params.buffer, {
      mime: params.mimeType,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

    return {
      key,
      url: this.getUrl(key),
      etag: ((result.res?.headers as Record<string, string>)?.etag) || undefined,
      provider: this.name,
    };
  }

  async delete(key: string): Promise<void> {
    this.ensureInitialized();
    await this.client.delete(key);
  }

  async checkHealth(): Promise<boolean> {
    try {
      this.ensureInitialized();
      // 尝试列举文件来检查连接是否正常
      await this.client.list(
        {
          "max-keys": 1,
        },
        {}
      );
      return true;
    } catch {
      return false;
    }
  }

  getUrl(key: string): string {
    if (this.options.cname) {
      const protocol = this.options.secure ? "https" : "http";
      return `${protocol}://${this.options.cname}/${key}`;
    }
    // 使用 OSS 默认域名
    const protocol = this.options.secure ? "https" : "http";
    return `${protocol}://${this.options.bucket}.${this.options.region}.aliyuncs.com/${key}`;
  }

  /**
   * 生成带签名的临时访问 URL（私有桶场景）。
   * ali-oss 的签名在本地计算，不发网络请求，可同步返回。
   */
  signUrl(key: string, expires?: number): string {
    this.ensureInitialized();
    const ttl = expires && expires > 0 ? expires : this.options.signedUrlExpires || 3600;
    return this.signClient.signatureUrl(key.replace(/^\//, ""), { expires: ttl });
  }

  /**
   * 流式读取对象内容（服务端代理转发用）。
   * 走读写 client（可带内网 endpoint），避免公网回源流量。
   */
  async getObjectStream(key: string): Promise<OssObjectStream> {
    this.ensureInitialized();
    const result = await this.client.getStream(key.replace(/^\//, ""));
    return {
      stream: result.stream,
      headers: (result.res?.headers || {}) as Record<string, string>,
      size: result.res?.size,
    };
  }

  private buildObjectKey(params: FileUploadParams): string {
    const basePath = this.options.basePath || "uploads";
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(4).toString("hex");
    const ext = this.getExtension(params.filename);
    const datePath = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
    return `${basePath}/${datePath}/${timestamp}-${randomStr}${ext}`;
  }

  private getExtension(filename: string): string {
    const idx = filename.lastIndexOf(".");
    return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error("Aliyun OSS provider not initialized. Call initialize() first.");
    }
  }
}
