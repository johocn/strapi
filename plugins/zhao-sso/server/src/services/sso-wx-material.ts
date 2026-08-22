import axios from "axios";
import fs from "fs/promises";
import type { Core } from "@strapi/strapi";

const MATERIAL_UID = "plugin::zhao-sso.sso-wx-material";

const isMock = () => process.env.MSG_WECHAT_PROVIDER === "mock";

/** koa-body 解析出的上传文件对象（filepath 为磁盘临时路径） */
export interface UploadFile {
  filepath?: string;
  name?: string;
  type?: string;
  size?: number;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const wechat = () => strapi.plugin("zhao-sso").service("sso-wechat");

  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  /** 上传到微信永久素材库（multipart，type 走 query 参数，文件字段名 media） */
  async function uploadMaterial(type: string, file: UploadFile): Promise<{ media_id: string; wx_url: string }> {
    if (isMock()) {
      // mock 模式返回固定 media_id，便于本地验收
      return { media_id: `mock_media_${Date.now()}`, wx_url: "" };
    }
    const accessToken = await wechat().getAccessToken("official_account");
    const buf = await fs.readFile(file.filepath as string);
    const form = new FormData();
    form.append(
      "media",
      new Blob([new Uint8Array(buf)], { type: file.type || "application/octet-stream" }),
      file.name || "upload"
    );
    const res = await axios.post("https://api.weixin.qq.com/cgi-bin/material/add_material", form, {
      params: { access_token: accessToken, type },
      timeout: 30000,
    });
    const d = res.data || {};
    if (d.errcode) throwErr("SSO_WX_MATERIAL_010", 502, `WeChat material error: ${d.errmsg}`);
    return { media_id: d.media_id, wx_url: d.url || "" };
  }

  return {
    async list(filters: { page?: number; pageSize?: number; type?: string; name?: string } = {}) {
      const page = Number(filters.page || 1);
      const pageSize = Number(filters.pageSize || 20);
      const where: Record<string, any> = {};
      if (filters.type) where.type = filters.type;
      if (filters.name) where.name = { $contains: filters.name };
      const rows = await strapi.db.query(MATERIAL_UID).findMany({
        where,
        orderBy: { createdAt: "desc" },
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      const total = await strapi.db.query(MATERIAL_UID).count({ where });
      return { data: rows, meta: { pagination: { page, pageSize, total } } };
    },

    async findOne(id: number) {
      const row = await strapi.db.query(MATERIAL_UID).findOne({ where: { id } });
      if (!row) throwErr("SSO_WX_MATERIAL_404", 404, "素材记录不存在");
      return row;
    },

    /** 上传永久素材并落库，返回含 media_id / wx_url 的记录 */
    async create(data: { type?: string; name?: string; remark?: string; file?: UploadFile }) {
      const type = data.type;
      if (!type) throwErr("SSO_WX_MATERIAL_400", 400, "缺少素材类型 type");
      const file = data.file;
      if (!file || !file.filepath) throwErr("SSO_WX_MATERIAL_400", 400, "缺少上传文件 file");

      let mediaId: string;
      let wxUrl = "";
      try {
        const result = await uploadMaterial(type, file);
        mediaId = result.media_id;
        wxUrl = result.wx_url;
      } finally {
        // 清理 koa-body 产生的临时文件（字段名非 Strapi 默认 files 时不自动回收）
        try {
          if (file.filepath) await fs.unlink(file.filepath);
        } catch { /* 临时文件清理失败忽略 */ }
      }

      return strapi.db.query(MATERIAL_UID).create({
        data: {
          type,
          name: data.name !== undefined ? data.name : null,
          media_id: mediaId,
          wx_url: wxUrl,
          remark: data.remark !== undefined ? data.remark : null,
        },
      });
    },

    /** 删除远程永久素材后删本地记录 */
    async remove(id: number) {
      const row = await this.findOne(id);
      if (!isMock() && row.media_id) {
        const accessToken = await wechat().getAccessToken("official_account");
        const res = await axios.post(
          "https://api.weixin.qq.com/cgi-bin/material/del_material",
          { media_id: row.media_id },
          { params: { access_token: accessToken }, timeout: 10000 }
        );
        const d = res.data || {};
        if (d.errcode) throwErr("SSO_WX_MATERIAL_020", 502, `WeChat del material error: ${d.errmsg}`);
      }
      return strapi.db.query(MATERIAL_UID).delete({ where: { id } });
    },
  };
};