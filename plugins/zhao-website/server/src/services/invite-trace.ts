import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-website.invite-trace";

/**
 * 邀请码流转埋点：记录 inviteCode/storedCode 在各环节（分享→落地→登录→回跳）的可见状态，
 * 用于定位邀请码失效/丢失的具体环节。埋点失败不抛错、不阻断主流程。
 */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 写入一条邀请码流转埋点（公开、无 site 维度；失败静默）。
   */
  async createPublic(data: any): Promise<any> {
    try {
      return await strapi.db.query(UID).create({ data });
    } catch (e) {
      strapi.log.warn("[invite-trace] 埋点写入失败", e);
      return null;
    }
  },
});