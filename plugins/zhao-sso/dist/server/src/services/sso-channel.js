"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CHANNEL_UID = "plugin::zhao-sso.sso-channel";
exports.default = ({ strapi }) => ({
    async findByCode(channelCode) {
        return strapi.db.query(CHANNEL_UID).findOne({
            where: { channel_code: channelCode, is_active: true },
        });
    },
    async trackClick(channelCode, utmParams) {
        const channel = await this.findByCode(channelCode);
        if (!channel) {
            strapi.log.warn(`[zhao-sso] Channel not found: ${channelCode}`);
            return null;
        }
        return { channel, utm: utmParams || {} };
    },
    async listAll() {
        return strapi.db.query(CHANNEL_UID).findMany({
            where: { is_active: true },
            orderBy: { channel_code: "asc" },
        });
    },
    async count(where) {
        return strapi.db.query(CHANNEL_UID).count({ where });
    },
    async listAllAdmin() {
        return strapi.db.query(CHANNEL_UID).findMany({ orderBy: { channel_code: "asc" } });
    },
    async create(data) {
        return strapi.db.query(CHANNEL_UID).create({
            data: {
                channel_code: data.channel_code,
                channel_name: data.channel_name,
                channel_type: data.channel_type,
                utm_template: data.utm_template || null,
                is_active: data.is_active !== undefined ? data.is_active : true,
                description: data.description || null,
            },
        });
    },
    async update(id, body) {
        const allowedFields = ["channel_name", "channel_type", "utm_template", "is_active", "description"];
        const data = {};
        for (const field of allowedFields) {
            if (body[field] !== undefined)
                data[field] = body[field];
        }
        return strapi.db.query(CHANNEL_UID).update({ where: { id }, data });
    },
    async channelReport() {
        const channels = await strapi.db.query(CHANNEL_UID).findMany({ where: { is_active: true } });
        const userService = () => strapi.plugin("zhao-sso").service("sso-user");
        const loginLogService = () => strapi.plugin("zhao-sso").service("sso-login-log");
        const report = [];
        for (const ch of channels) {
            const registrations = await userService().count({ where: { register_channel: ch.channel_code } });
            const logins = await loginLogService().count({ where: { channel_code: ch.channel_code, success: true } });
            report.push({ channel_code: ch.channel_code, channel_name: ch.channel_name, registrations, logins });
        }
        return report;
    },
});
