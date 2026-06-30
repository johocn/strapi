import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import type { Core } from "@strapi/strapi";

const USER_UID = "plugin::zhao-sso.sso-user";

function sanitize(user: any) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  void password_hash;
  return safe;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  return {
  async createUser(data: {
    username?: string;
    mobile?: string;
    email?: string;
    password?: string;
    register_channel?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    invite_code_used?: string;
  }) {
    if (!data.username && !data.mobile && !data.email) {
      throwErr("SSO_USER_001", 400, "username/mobile/email at least one required");
    }

    const password_hash = data.password ? await bcrypt.hash(data.password, 12) : null;

    return strapi.db.query(USER_UID).create({
      data: {
        uuid: uuidv4(),
        username: data.username || null,
        mobile: data.mobile || null,
        email: data.email || null,
        password_hash,
        status: "active",
        register_channel: data.register_channel || null,
        utm_source: data.utm_source || null,
        utm_medium: data.utm_medium || null,
        utm_campaign: data.utm_campaign || null,
        invite_code_used: data.invite_code_used || null,
        login_count: 0,
      },
    });
  },

  async findByIdentifier(identifier: string) {
    return strapi.db.query(USER_UID).findOne({
      where: {
        $or: [
          { email: identifier.toLowerCase() },
          { username: identifier },
          { mobile: identifier },
        ],
      },
    });
  },

  async findByUuid(uuid: string) {
    const user = await strapi.db.query(USER_UID).findOne({ where: { uuid } });
    return sanitize(user);
  },

  async verifyPassword(user: any, password: string): Promise<boolean> {
    if (!user.password_hash) {
      const raw = await strapi.db.query(USER_UID).findOne({ where: { id: user.id }, select: ["password_hash"] });
      if (!raw?.password_hash) return false;
      return bcrypt.compare(password, raw.password_hash);
    }
    return bcrypt.compare(password, user.password_hash);
  },

  async updateLoginInfo(userId: number, channelCode?: string) {
    const current = await strapi.db.query(USER_UID).findOne({ where: { id: userId } });
    const updateData: any = {
      last_login_at: new Date(),
      login_count: (current?.login_count || 0) + 1,
    };
    if (channelCode) {
      updateData.last_login_channel = channelCode;
    }
    return strapi.db.query(USER_UID).update({
      where: { id: userId },
      data: updateData,
    });
  },

  async changePassword(userId: number, newPassword: string) {
    const password_hash = await bcrypt.hash(newPassword, 12);
    return strapi.db.query(USER_UID).update({
      where: { id: userId },
      data: { password_hash, password_changed_at: new Date() },
    });
  },

  async isBlocked(user: any): Promise<boolean> {
    return user.status === "blocked";
  },

  async findById(id: number) {
    const user = await strapi.db.query(USER_UID).findOne({ where: { id } });
    return sanitize(user);
  },

  async bindContact(userId: number, type: string, identifier: string, password?: string) {
    const updateData: any = {};
    if (type === "mobile") updateData.mobile = identifier;
    if (type === "email") updateData.email = identifier;
    if (type === "username") updateData.username = identifier;
    if (password) updateData.password_hash = await bcrypt.hash(password, 12);
    return strapi.db.query(USER_UID).update({ where: { id: userId }, data: updateData });
  },

  async bindThirdParty(userId: number, providerData: { provider: string; provider_user_id: string; nickname?: string; avatar?: string; raw?: any }) {
    return strapi.db.query("plugin::zhao-sso.sso-third-party-binding").create({
      data: {
        user: { id: userId },
        provider: providerData.provider,
        provider_user_id: providerData.provider_user_id,
        provider_nickname: providerData.nickname || null,
        provider_avatar: providerData.avatar || null,
        provider_data: providerData.raw || null,
        bound_at: new Date(),
      },
    });
  },

  async unbindThirdParty(userId: number, provider: string) {
    return strapi.db.query("plugin::zhao-sso.sso-third-party-binding").delete({
      where: { user: { id: userId }, provider },
    });
  },

  async count(where?: any) {
    return strapi.db.query(USER_UID).count({ where });
  },

  async findMany(params: { where?: any; orderBy?: any; limit?: number; offset?: number }) {
    const users = await strapi.db.query(USER_UID).findMany({
      where: params.where || {},
      orderBy: params.orderBy || { created_at: "desc" },
      limit: params.limit,
      offset: params.offset,
    });
    return users.map(sanitize);
  },

  async findOneWithBindings(id: number) {
    const user = await strapi.db.query(USER_UID).findOne({
      where: { id },
      populate: { third_party_bindings: true },
    });
    return sanitize(user);
  },

  async updateAdmin(id: number, body: any) {
    const allowedFields = ["status", "nickname", "username"];
    const data: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) data[field] = body[field];
    }
    const user = await strapi.db.query(USER_UID).update({ where: { id }, data });
    return sanitize(user);
  },
  };
};
