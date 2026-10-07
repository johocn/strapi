"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const promises_1 = __importDefault(require("fs/promises"));
const MATERIAL_UID = "plugin::zhao-sso.sso-wx-material";
const isMock = () => process.env.MSG_WECHAT_PROVIDER === "mock";
exports.default = ({ strapi }) => {
    const wechat = () => strapi.plugin("zhao-sso").service("sso-wechat");
    function throwErr(code, status, message) {
        const e = new Error(message);
        e.code = code;
        e.status = status;
        throw e;
    }
    /** 上传到微信永久素材库（multipart，type 走 query 参数，文件字段名 media） */
    async function uploadMaterial(type, file) {
        if (isMock()) {
            // mock 模式返回固定 media_id，便于本地验收
            return { media_id: `mock_media_${Date.now()}`, wx_url: "" };
        }
        const accessToken = await wechat().getAccessToken("official_account");
        const buf = await promises_1.default.readFile(file.filepath);
        const form = new FormData();
        form.append("media", new Blob([new Uint8Array(buf)], { type: file.type || "application/octet-stream" }), file.name || "upload");
        const res = await axios_1.default.post("https://api.weixin.qq.com/cgi-bin/material/add_material", form, {
            params: { access_token: accessToken, type },
            timeout: 30000,
        });
        const d = res.data || {};
        if (d.errcode)
            throwErr("SSO_WX_MATERIAL_010", 502, `WeChat material error: ${d.errmsg}`);
        return { media_id: d.media_id, wx_url: d.url || "" };
    }
    return {
        async list(filters = {}) {
            const page = Number(filters.page || 1);
            const pageSize = Number(filters.pageSize || 20);
            const where = {};
            if (filters.type)
                where.type = filters.type;
            if (filters.name)
                where.name = { $contains: filters.name };
            const rows = await strapi.db.query(MATERIAL_UID).findMany({
                where,
                orderBy: { createdAt: "desc" },
                limit: pageSize,
                offset: (page - 1) * pageSize,
            });
            const total = await strapi.db.query(MATERIAL_UID).count({ where });
            return { data: rows, meta: { pagination: { page, pageSize, total } } };
        },
        async findOne(id) {
            const row = await strapi.db.query(MATERIAL_UID).findOne({ where: { id } });
            if (!row)
                throwErr("SSO_WX_MATERIAL_404", 404, "素材记录不存在");
            return row;
        },
        /** 上传永久素材并落库，返回含 media_id / wx_url 的记录 */
        async create(data) {
            const type = data.type;
            if (!type)
                throwErr("SSO_WX_MATERIAL_400", 400, "缺少素材类型 type");
            const file = data.file;
            if (!file || !file.filepath)
                throwErr("SSO_WX_MATERIAL_400", 400, "缺少上传文件 file");
            let mediaId;
            let wxUrl = "";
            try {
                const result = await uploadMaterial(type, file);
                mediaId = result.media_id;
                wxUrl = result.wx_url;
            }
            finally {
                // 清理 koa-body 产生的临时文件（字段名非 Strapi 默认 files 时不自动回收）
                try {
                    if (file.filepath)
                        await promises_1.default.unlink(file.filepath);
                }
                catch { /* 临时文件清理失败忽略 */ }
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
        async remove(id) {
            const row = await this.findOne(id);
            if (!isMock() && row.media_id) {
                const accessToken = await wechat().getAccessToken("official_account");
                const res = await axios_1.default.post("https://api.weixin.qq.com/cgi-bin/material/del_material", { media_id: row.media_id }, { params: { access_token: accessToken }, timeout: 10000 });
                const d = res.data || {};
                if (d.errcode)
                    throwErr("SSO_WX_MATERIAL_020", 502, `WeChat del material error: ${d.errmsg}`);
            }
            return strapi.db.query(MATERIAL_UID).delete({ where: { id } });
        },
        /**
         * 从微信永久素材库拉取素材并落库（batchget_material，仅 image/voice/video）
         * 已存在的 media_id 走更新（name/url），否则新增；video/voice 微信不返回 url
         */
        async syncFromWechat(type) {
            if (!["image", "voice", "video"].includes(type)) {
                throwErr("SSO_WX_MATERIAL_400", 400, "仅支持同步 image/voice/video 类型");
            }
            if (isMock())
                return { added: 0, updated: 0, total: 0 };
            const accessToken = await wechat().getAccessToken("official_account");
            let added = 0;
            let updated = 0;
            let offset = 0;
            const pageSize = 20;
            let total = 0;
            // 微信 batchget_material 每次最多拉 20 条，分页拉全
            while (true) {
                const res = await axios_1.default.post("https://api.weixin.qq.com/cgi-bin/material/batchget_material", { type, offset, count: pageSize }, { params: { access_token: accessToken }, timeout: 30000 });
                const d = res.data || {};
                if (d.errcode)
                    throwErr("SSO_WX_MATERIAL_030", 502, `WeChat batchget material error: ${d.errmsg}`);
                const items = d.item || [];
                total = d.total_count || 0;
                for (const it of items) {
                    const exist = await strapi.db.query(MATERIAL_UID).findOne({ where: { media_id: it.media_id } });
                    const data = {
                        type,
                        name: it.name || null,
                        media_id: it.media_id,
                        wx_url: it.url || "",
                    };
                    if (exist) {
                        await strapi.db.query(MATERIAL_UID).update({ where: { id: exist.id }, data });
                        updated++;
                    }
                    else {
                        await strapi.db.query(MATERIAL_UID).create({ data });
                        added++;
                    }
                }
                offset += items.length;
                if (!items.length || offset >= total)
                    break;
            }
            return { added, updated, total };
        },
    };
};
//# sourceMappingURL=sso-wx-material.js.map