import { Core } from '@strapi/strapi';
export interface MediaStream {
    /** 为受保护媒体路径签发短期签名播放地址（需已登录调用） */
    issueStreamUrl(input: string): Promise<string>;
    /** 校验签名令牌，返回物理文件路径；非法返回 null */
    resolveStreamFile(params: {
        path?: string;
        exp?: string | number;
        sig?: string;
    }): {
        filePath: string;
        mime: string;
    } | null;
}
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => MediaStream;
export default _default;
