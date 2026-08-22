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
};
export default _default;
