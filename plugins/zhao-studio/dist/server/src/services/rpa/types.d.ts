export type RpaPlatform = 'xiaohongshu' | 'toutiao' | 'bilibili';
export interface RpaPublishInput {
    title: string;
    content: string;
    /** 封面图 URL（本地路径或 http URL，Playwright setInputFiles 支持 URL 时需先下载，见 shared.downloadIfRemote） */
    coverImage?: string;
    /** 配图 URL 列表（图文平台必填至少 1 张） */
    images?: string[];
    /** bilibili 视频投稿场景：视频文件 URL（rpa-client 会下载到临时目录再 setInputFiles） */
    videoUrl?: string;
}
export interface RpaPublishOutput {
    success: boolean;
    externalId?: string;
    url?: string;
    error?: string;
}
export interface RpaDriver {
    readonly platform: RpaPlatform;
    /**
     * 在已导航到发布页的 page 上完成「填写 → 上传 → 提交 → 校验成功」。
     * 任何一步失败都应 throw，由 rpa-client 统一捕获 + 失败取证。
     * @param workDir 可写的临时目录，用于下载远程图片等中间产物
     */
    publish(page: any, input: RpaPublishInput, workDir: string): Promise<RpaPublishOutput>;
    /** 视频投稿子类方法（bilibili 内部通过 this.publishVideo 调用） */
    publishVideo?(page: any, input: RpaPublishInput, workDir: string): Promise<RpaPublishOutput>;
    /** 图文投稿子类方法 */
    publishArticle?(page: any, input: RpaPublishInput, workDir?: string): Promise<RpaPublishOutput>;
}
//# sourceMappingURL=types.d.ts.map