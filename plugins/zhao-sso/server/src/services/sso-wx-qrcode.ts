import axios from "axios";
import type { Core } from "@strapi/strapi";

const QRCODE_UID = "plugin::zhao-sso.sso-wx-qrcode";
const EVENT_UID = "plugin::zhao-sso.sso-wx-event";

const isMock = () => process.env.MSG_WECHAT_PROVIDER === "mock";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const wechat = () => strapi.plugin("zhao-sso").service("sso-wechat");

  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  /** 把字符串场景值映射为稳定数字 scene_id（QR_SCENE 要求数字 scene_id） */
  function hashSceneId(s: string): number {
    let h = 0;
    const max = 2147483647;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) % max;
    }
    return h;
  }

  /** 调微信 cgi-bin 接口；如需对象，返回解析后的 data */
  async function fetchApi(path: string, body: any): Promise<any> {
    const accessToken = await wechat().getAccessToken("official_account");
    const res = await axios.post(`https://api.weixin.qq.com/cgi-bin/${path}`, body, {
      params: { access_token: accessToken },
      timeout: 10000,
    });
    const data = res.data || {};
    if (data.errcode) {
      throwErr("SSO_WX_QRCODE_010", 502, `WeChat qrcode error: ${data.errmsg}`);
    }
    return data;
  }

  return {
    /** 生成带参二维码（临时 QR_SCENE / 永久 QR_LIMIT_STR_SCENE） */
    async create(data: {
      scene_key: string;
      title?: string;
      kind?: "temporary" | "permanent";
      expire_seconds?: number;
      qrcode_url?: string;
      remark?: string;
    }) {
      const kind = data.kind === "permanent" ? "permanent" : "temporary";
      let ticket: string;
      if (isMock()) {
        // mock 模式返回预设 ticket，便于本地验收
        ticket = `mock_ticket_${Date.now()}`;
      } else {
        const actionInfo =
          kind === "permanent"
            ? { scene: { scene_str: data.scene_key } }
            : { scene: { scene_id: hashSceneId(data.scene_key) } };
        const body =
          kind === "permanent"
            ? { action_name: "QR_LIMIT_STR_SCENE", action_info: actionInfo }
            : {
                action_name: "QR_SCENE",
                expire_seconds: data.expire_seconds || 2592000,
                action_info: actionInfo,
              };
        const resp = await fetchApi("qrcode/create", body);
        ticket = resp.ticket;
      }
      const wxUrl = `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(ticket)}`;
      return strapi.db.query(QRCODE_UID).create({
        data: {
          scene_key: data.scene_key,
          title: data.title || null,
          kind,
          expire_seconds: kind === "permanent" ? null : data.expire_seconds || 2592000,
          ticket,
          wx_url: wxUrl,
          qrcode_url: data.qrcode_url || null,
          remark: data.remark || null,
        },
      });
    },

    async list(filters: { page?: number; pageSize?: number; scene_key?: string } = {}) {
      const page = Number(filters.page || 1);
      const pageSize = Number(filters.pageSize || 20);
      const where: Record<string, any> = {};
      if (filters.scene_key) where.scene_key = { $contains: filters.scene_key };
      const rows = await strapi.db.query(QRCODE_UID).findMany({
        where,
        orderBy: { createdAt: "desc" },
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      const total = await strapi.db.query(QRCODE_UID).count({ where });
      return { data: rows, meta: { pagination: { page, pageSize, total } } };
    },

    async findOne(id: number) {
      const row = await strapi.db.query(QRCODE_UID).findOne({ where: { id } });
      if (!row) throwErr("SSO_WX_QRCODE_404", 404, "二维码记录不存在");
      return row;
    },

    /** 按 scene_key 精确查最近一条（带参二维码复用场景） */
    async findBySceneKey(scene_key: string) {
      const rows = await strapi.db.query(QRCODE_UID).findMany({
        where: { scene_key },
        orderBy: { createdAt: "desc" },
        limit: 1,
      });
      return rows?.[0] || null;
    },

    async remove(id: number) {
      return strapi.db.query(QRCODE_UID).delete({ where: { id } });
    },

    /** 事件日志查询（可按 openid 筛选，倒序分页） */
    async events(filters: { page?: number; pageSize?: number; openid?: string } = {}) {
      const page = Number(filters.page || 1);
      const pageSize = Number(filters.pageSize || 20);
      const where: Record<string, any> = {};
      if (filters.openid) where.openid = { $contains: filters.openid };
      const rows = await strapi.db.query(EVENT_UID).findMany({
        where,
        orderBy: { createdAt: "desc" },
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      const total = await strapi.db.query(EVENT_UID).count({ where });
      return { data: rows, meta: { pagination: { page, pageSize, total } } };
    },
  };
};