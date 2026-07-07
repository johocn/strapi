import { Core } from '@strapi/strapi';
export interface UploadParams {
    fileBuffer: Buffer;
    originalName: string;
    customName?: string | null;
    mimeType: string;
    fileSize: number;
    folderInput?: string;
    folderIdInput?: string;
    siteId?: number;
    category?: string;
    uploader?: number;
}
export interface UploadResult {
    id: number;
    documentId: string;
    name: string;
    url: string;
    hash: string;
    ext: string;
    mime: string;
    size: number;
    provider: string;
    folderPath: string;
    provider_metadata: {
        ossUrl: string | null;
        localUrl: string;
        ossStatus: "success" | "pending";
    };
}
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 获取下一个可用的 pathId
     */
    getNextPathId(): Promise<number>;
    /**
     * 按人类可读路径确保文件夹存在（不存在则逐级创建）
     */
    ensureFolderByPath(humanPath: string): Promise<any>;
    /**
     * 根据 folderId 构建人类可读路径
     */
    buildHumanPath(folderId: number): Promise<string>;
    /**
     * 上传文件：本地存储 + OSS 同步 + 数据库记录
     */
    uploadFile(params: UploadParams): Promise<UploadResult>;
    /**
     * 检查用户是否有权删除指定文件
     * 规则：admin / channel-admin 可删除任何文件，其他用户只能删除自己创建的文件
     */
    canDeleteFile(fileId: number, user: any): Promise<boolean>;
    /**
     * 文件列表查询（分页 + 过滤）
     * 管理员以上角色不过滤 createdBy，其他用户自动添加 createdBy 过滤
     */
    listFiles(params: {
        page: number;
        pageSize: number;
        folderPath?: string;
        mime?: string;
        search?: string;
        sort?: string;
        user?: any;
    }): Promise<{
        list: any[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
            pageCount: number;
        };
    }>;
    /**
     * 获取文件夹树
     */
    getFolderTree(): Promise<any[]>;
    /**
     * 创建文件夹
     */
    createFolder(name: string, parentId?: number | null): Promise<{
        id: number;
        documentId: string;
        name: string;
        path: string;
    }>;
    /**
     * 根据 ID 查找文件
     */
    findFileById(fileId: number): Promise<any | null>;
    /**
     * 同步记录列表查询（分页 + 过滤）
     */
    listSyncRecords(params: {
        page: number;
        pageSize: number;
        status?: string;
    }): Promise<{
        data: any[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
            pageCount: number;
        };
    }>;
    /**
     * 修复文件夹结构：删除无效的数字名文件夹 + 修复文件的 folderPath
     */
    repairFolders(): Promise<string[]>;
    /**
     * 为站点创建默认媒体文件夹（site-config 创建时调用）
     */
    ensureSiteDefaultFolders(siteId: number): Promise<any>;
    /**
     * 按站点查询媒体文件（通过 media-meta 关联表）
     */
    listFilesBySite(siteId: number, params?: {
        page?: number;
        pageSize?: number;
        category?: string;
    }): Promise<{
        list: any[];
        pagination: any;
    }>;
};
export default _default;
