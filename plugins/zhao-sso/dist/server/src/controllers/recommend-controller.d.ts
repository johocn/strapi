import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /** C 端"猜你喜欢"：基于 sso-user 画像兴趣标签推荐 课程/文章/活动 */
    my(ctx: any): Promise<{
        error: string;
    }>;
};
export default _default;
