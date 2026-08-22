import axios from "axios";
import type { Core } from "@strapi/strapi";

const ARTICLE_UID = "plugin::zhao-sso.sso-wx-article";

const isMock = () => process.env.MSG_WECHAT_PROVIDER === "mock";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const wechat = () => strapi.plugin("zhao-sso").service("sso-wechat");

  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  /** 组装 cgi-bin 图文草稿所需的 article 结构（api_version 由外层传入） */
  function articleItem(data: Record<string, any>) {
    return {
      title: data.title || "",
      author: data.author || "",
      digest: data.digest || "",
      content: data.content || "",
      content_source_url: data.content_source_url || "",
      thumb_media_id: data.thumb_media_id || "",
      show_cover_pic: data.show_cover_pic === false ? 0 : 1,
    };
  }

  /** 调微信 cgi-bin JSON 接口（POST）；非 mock 模式下调用 */
  async function postApi(path: string, body: any): Promise<any> {
    const accessToken = await wechat().getAccessToken("official_account");
    const res = await axios.post(`https://api.weixin.qq.com/cgi-bin/${path}`, body, {
      params: { access_token: accessToken },
      timeout: 15000,
    });
    const d = res.data || {};
    if (d.errcode) throwErr("SSO_WX_ARTICLE_010", 502, `WeChat ${path} error: ${d.errmsg}`);
    return d;
  }

  /**
   * 旁路登记 zhao-studio 发布台账（platform=wechat）。
   * zhao-studio 的 publish-record 无 platform 独立字段（article/account 为可选关联），
   * 以 JSON 元信息写入 error 字段记平台来源；判空 + try/catch，失败不影响发布主流程。
   */
  async function registerPublishRecord(article: any) {
    try {
      const studio = strapi.plugin("zhao-studio");
      if (!studio) return;
      await strapi.documents("plugin::zhao-studio.publish-record").create({
        data: {
          externalId: article.publish_id,
          status: "success",
          error: JSON.stringify({ platform: "wechat", title: article.title, draftId: article.draft_id }),
          publishedAt: new Date(),
        },
      });
    } catch { /* 旁路登记失败静默，不影响公众号发布主流程 */ }
  }

  return {
    async list(filters: { page?: number; pageSize?: number; title?: string; publish_state?: string } = {}) {
      const page = Number(filters.page || 1);
      const pageSize = Number(filters.pageSize || 20);
      const where: Record<string, any> = {};
      if (filters.title) where.title = { $contains: filters.title };
      if (filters.publish_state) where.publish_state = filters.publish_state;
      const rows = await strapi.db.query(ARTICLE_UID).findMany({
        where,
        orderBy: { createdAt: "desc" },
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      const total = await strapi.db.query(ARTICLE_UID).count({ where });
      return { data: rows, meta: { pagination: { page, pageSize, total } } };
    },

    async findOne(id: number) {
      const row = await strapi.db.query(ARTICLE_UID).findOne({ where: { id } });
      if (!row) throwErr("SSO_WX_ARTICLE_404", 404, "图文记录不存在");
      return row;
    },

    /** 创建图文草稿：调 draft/add 写入 draft_id，本地 publish_state=draft */
    async create(data: {
      title: string;
      author?: string;
      digest?: string;
      content?: string;
      thumb_media_id?: string;
      pic_url?: string;
      content_source_url?: string;
      show_cover_pic?: boolean;
    }) {
      if (!data.title) throwErr("SSO_WX_ARTICLE_400", 400, "缺少图文标题 title");
      let draftId: string;
      if (isMock()) {
        draftId = `mock_draft_${Date.now()}`;
      } else {
        const resp = await postApi("draft/add", { articles: [articleItem(data)], api_version: 1 });
        draftId = resp.media_id;
      }
      return strapi.db.query(ARTICLE_UID).create({
        data: {
          title: data.title,
          author: data.author !== undefined ? data.author : null,
          digest: data.digest !== undefined ? data.digest : null,
          content: data.content !== undefined ? data.content : null,
          thumb_media_id: data.thumb_media_id !== undefined ? data.thumb_media_id : null,
          pic_url: data.pic_url !== undefined ? data.pic_url : null,
          content_source_url: data.content_source_url !== undefined ? data.content_source_url : null,
          show_cover_pic: data.show_cover_pic !== undefined ? data.show_cover_pic : true,
          draft_id: draftId,
          publish_state: "draft",
        },
      });
    },

    /** 更新本地 + 重提草稿 draft/update；已发布返回 400 */
    async update(id: number, data: Record<string, any>) {
      const row = await this.findOne(id);
      if (row.publish_state === "published") {
        throwErr("SSO_WX_ARTICLE_422", 400, "已发布的图文不可修改");
      }
      const updateData: Record<string, any> = {};
      const keys = ["title", "author", "digest", "content", "thumb_media_id", "pic_url", "content_source_url", "show_cover_pic"];
      for (const k of keys) if (data[k] !== undefined) updateData[k] = data[k];

      if (row.draft_id && !isMock()) {
        await postApi("draft/update", {
          media_id: row.draft_id,
          index: 0,
          articles: [articleItem(updateData)],
        });
      }
      return strapi.db.query(ARTICLE_UID).update({ where: { id }, data: updateData });
    },

    /** 发布：校验已提草稿 → freepublish/submit 记 publish_id 置 publishing；旁路登记 zhao-studio 发布台账 */
    async publish(id: number) {
      const row = await this.findOne(id);
      if (!row.draft_id) throwErr("SSO_WX_ARTICLE_400", 400, "请先创建图文草稿再发布");

      let publishId: string;
      if (isMock()) {
        publishId = `mock_publish_${Date.now()}`;
      } else {
        const resp = await postApi("freepublish/submit", { media_id: row.draft_id });
        publishId = resp.publish_id;
      }

      const updated = await strapi.db.query(ARTICLE_UID).update({
        where: { id },
        data: { publish_id: publishId, publish_state: "publishing", last_error: null },
      });
      await registerPublishRecord(updated);
      return updated;
    },

    /** 状态刷新：若 publishing 调 freepublish/get 刷新 publish_state */
    async status(id: number) {
      const row = await this.findOne(id);
      if (row.publish_state !== "publishing" || !row.publish_id) return row;

      if (isMock()) {
        // mock 模式下一次查询即视为发布成功
        return strapi.db.query(ARTICLE_UID).update({
          where: { id },
          data: { publish_state: "published", wx_published_at: new Date(), last_error: null },
        });
      }

      const resp = await postApi("freepublish/get", { publish_id: row.publish_id });
      let state = "publishing";
      let err: string | null = null;
      if (resp.publish_status === 0) {
        state = "published";
      } else if (resp.publish_status === 2 || resp.publish_status === 3) {
        state = "failed";
        err = resp.fail_detail || `微信发布被拒/撤回(publish_status=${resp.publish_status})`;
      }
      const updateData: Record<string, any> = { publish_state: state, last_error: err };
      if (state === "published") updateData.wx_published_at = new Date();
      return strapi.db.query(ARTICLE_UID).update({ where: { id }, data: updateData });
    },

    /** 删除：调 draft/delete 后删本地 */
    async remove(id: number) {
      const row = await this.findOne(id);
      if (row.draft_id && !isMock()) {
        await postApi("draft/delete", { media_id: row.draft_id });
      }
      return strapi.db.query(ARTICLE_UID).delete({ where: { id } });
    },
  };
};