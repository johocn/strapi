import { Core } from '@strapi/strapi';
/** koa-body 解析出的上传文件对象（filepath 为磁盘临时路径） */
export interface UploadFile {
    filepath?: string;
    name?: string;
    type?: string;
    size?: number;
}
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    list(filters?: {
        page?: number;
        pageSize?: number;
        type?: string;
        name?: string;
    }): Promise<{
        data: any[];
        meta: {
            pagination: {
                page: number;
                pageSize: number;
                total: number;
            };
        };
    }>;
    findOne(id: number): Promise<any>;
    /** 上传永久素材并落库，返回含 media_id / wx_url 的记录 */
    create(data: {
        type?: string;
        name?: string;
        remark?: string;
        file?: UploadFile;
    }): Promise<any>;
    /** 删除远程永久素材后删本地记录 */
    remove(id: number): Promise<any>;
    /**
     * 从微信永久素材库拉取素材并落库（batchget_material，仅 image/voice/video）
     * 已存在的 media_id 走更新（name/url），否则新增；video/voice 微信不返回 url
     */
    syncFromWechat(type: string): Promise<{
        added: number;
        updated: number;
        total: number;
    }>;
};
export default _default;
