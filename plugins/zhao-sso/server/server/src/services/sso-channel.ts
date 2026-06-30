import type { Core } from "@strapi/strapi";

const CHANNEL_UID = "plugin::zhao-sso.sso-channel";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findByCode(channelCode: string) {
    return strapi.db.query(CHANNEL_UID).findOne({
      where: { channel_code: channelCode, is_active: true },
    });
  },

  async trackClick(channelCode: string, utmParams?: Record<string, string>) {
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

  async count(where?: any) {
    return strapi.db.query(CHANNEL_UID).count({ where });
  },

  async listAllAdmin() {
    return strapi.db.query(CHANNEL_UID).findMany({ orderBy: { channel_code: "asc" } });
  },

  async create(data: {
    channel_code: string;
    channel_name: string;
    channel_type: string;
    utm_template?: string;
    is_active?: boolean;
    description?: string;
  }) {
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

  async update(id: number, body: any) {
    const allowedFields = ["channel_name", "channel_type", "utm_template", "is_active", "description"];
    const data: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) data[field] = body[field];
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
