import axios from "axios";
import type { Core } from "@strapi/strapi";

const MENU_UID = "plugin::zhao-sso.sso-wx-menu";

const isMock = () => process.env.MSG_WECHAT_PROVIDER === "mock";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const wechat = () => strapi.plugin("zhao-sso").service("sso-wechat");

  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  /** 调微信 cgi-bin 接口（GET 用 params，POST 用 body）；mock 模式直接返回预设结果 */
  async function fetchApi(method: "GET" | "POST", path: string, body?: any): Promise<any> {
    const accessToken = await wechat().getAccessToken("official_account");
    const res = await axios({
      method,
      url: `https://api.weixin.qq.com/cgi-bin/${path}`,
      params: { access_token: accessToken },
      data: body,
      timeout: 10000,
    });
    const data = res.data || {};
    if (data.errcode) {
      throwErr("SSO_WX_MENU_010", 502, `WeChat menu error: ${data.errmsg}`);
    }
    return data;
  }

  return {
    async list(filters: { page?: number; pageSize?: number; name?: string } = {}) {
      const page = Number(filters.page || 1);
      const pageSize = Number(filters.pageSize || 20);
      const where: Record<string, any> = {};
      if (filters.name) where.name = { $contains: filters.name };
      const rows = await strapi.db.query(MENU_UID).findMany({
        where,
        orderBy: { createdAt: "desc" },
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      const total = await strapi.db.query(MENU_UID).count({ where });
      return { data: rows, meta: { pagination: { page, pageSize, total } } };
    },

    async findOne(id: number) {
      const row = await strapi.db.query(MENU_UID).findOne({ where: { id } });
      if (!row) throwErr("SSO_WX_MENU_404", 404, "菜单记录不存在");
      return row;
    },

    async create(data: { name: string; menu_json: any; enabled?: boolean }) {
      return strapi.db.query(MENU_UID).create({
        data: {
          name: data.name,
          menu_json: data.menu_json,
          enabled: data.enabled !== undefined ? data.enabled : true,
          publish_state: "local",
        },
      });
    },

    async update(id: number, data: { name?: string; menu_json?: any; enabled?: boolean }) {
      const updateData: Record<string, any> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.menu_json !== undefined) updateData.menu_json = data.menu_json;
      if (data.enabled !== undefined) updateData.enabled = data.enabled;
      return strapi.db.query(MENU_UID).update({ where: { id }, data: updateData });
    },

    async remove(id: number) {
      return strapi.db.query(MENU_UID).delete({ where: { id } });
    },

    /** 一键下发本地菜单到微信公众号 */
    async publish(id: number) {
      const row = await this.findOne(id);
      const publish = async () => {
        if (isMock()) return { errcode: 0 };
        return fetchApi("POST", "menu/create", row.menu_json);
      };
      try {
        await publish();
        return strapi.db.query(MENU_UID).update({
          where: { id },
          data: { publish_state: "published", last_publish_at: new Date(), last_error: null },
        });
      } catch (e: any) {
        await strapi.db.query(MENU_UID).update({
          where: { id },
          data: { publish_state: "failed", last_error: e.message || String(e) },
        });
        throwErr("SSO_WX_MENU_PUBLISH", 502, e.message || "菜单下发失败");
      }
    },

    /** 删除线上菜单 */
    async deleteRemote() {
      if (isMock()) return { errcode: 0 };
      return fetchApi("GET", "menu/delete");
    },

    /** 获取线上菜单信息 */
    async getRemote() {
      if (isMock()) {
        return { is_menu_open: 1, selfmenu_info: { button: [] } };
      }
      return fetchApi("GET", "get_current_selfmenu_info");
    },

    /** 公众号已添加模板只读列表（模板消息配置用） */
    async listTemplates() {
      if (isMock()) {
        return {
          template_list: [
            {
              template_id: "mock_template_id_01",
              title: "活动通知",
              primary_industry: "IT科技",
              deputy_industry: "互联网|电子商务",
              content: "您有新的活动通知",
            },
          ],
        };
      }
      return fetchApi("GET", "template/get_all_private_template");
    },

    /** 从模板库添加公共模板到公众号，返回新 template_id（透传微信 errcode/errmsg） */
    async addFromLibrary(data: { templateIdShort: string; keywordNameList?: string[] }) {
      const { templateIdShort, keywordNameList } = data || {};
      if (!templateIdShort || !String(templateIdShort).trim()) {
        throwErr("SSO_WX_MENU_400", 400, "缺少模板库编号 template_id_short");
      }
      const body: any = { template_id_short: String(templateIdShort).trim() };
      const kws = (Array.isArray(keywordNameList) ? keywordNameList : [])
        .map((s: any) => String(s).trim())
        .filter(Boolean);
      if (kws.length) body.keyword_name_list = kws;
      if (isMock()) return { template_id: "mock_" + Date.now(), errcode: 0 };
      const accessToken = await wechat().getAccessToken("official_account");
      const res = await axios({
        method: "POST",
        url: "https://api.weixin.qq.com/cgi-bin/template/api_add_template",
        params: { access_token: accessToken },
        data: body,
        timeout: 10000,
      });
      const w = res.data || {};
      if (w.errcode) throwErr("SSO_WX_TPL_ADD", 400, `微信添加模板失败(errcode=${w.errcode}): ${w.errmsg}`);
      return { template_id: w.template_id, errcode: 0 };
    },
  };
};