import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    upload(ctx: any): Promise<void>;
    getSyncStatus(ctx: any): Promise<void>;
    mediaList(ctx: any): Promise<void>;
    getFolders(ctx: any): Promise<void>;
    createFolder(ctx: any): Promise<void>;
    deleteMedia(ctx: any): Promise<void>;
    getReferences(ctx: any): Promise<void>;
    repairFolders(ctx: any): Promise<void>;
    /**
     * 为受保护媒体路径签发短期签名播放地址（is-authenticated 已校验登录）
     * body: { path } → 原始视频/音频 URL（本地 /static 或 /uploads 路径）
     * 返回: { data: { url } }，url 为相对 BASE_API 的流式地址
     */
    issueStreamToken(ctx: any): Promise<void>;
    /**
     * 流式交付受保护媒体文件（支持 Range 断点续播/拖动进度条）
     * query: path(URL路径) + exp(过期秒级时间戳) + sig(HMAC 签名)
     */
    streamMedia(ctx: any): Promise<void>;
};
export default _default;
