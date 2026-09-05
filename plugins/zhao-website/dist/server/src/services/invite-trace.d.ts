import { Core } from '@strapi/strapi';
/**
 * 邀请码流转埋点：记录 inviteCode/storedCode 在各环节（分享→落地→登录→回跳）的可见状态，
 * 用于定位邀请码失效/丢失的具体环节。埋点失败不抛错、不阻断主流程。
 */
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 写入一条邀请码流转埋点（公开、无 site 维度；失败静默）。
     */
    createPublic(data: any): Promise<any>;
};
export default _default;
