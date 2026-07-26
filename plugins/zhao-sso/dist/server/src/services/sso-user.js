"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const USER_UID = "plugin::zhao-sso.sso-user";
function sanitize(user) {
    if (!user)
        return null;
    const { password_hash, ...safe } = user;
    void password_hash;
    return safe;
}
exports.default = ({ strapi }) => {
    function throwErr(code, status, message) {
        const e = new Error(message);
        e.code = code;
        e.status = status;
        throw e;
    }
    return {
        async createUser(data) {
            if (!data.username && !data.mobile && !data.email) {
                throwErr("SSO_USER_001", 400, "username/mobile/email at least one required");
            }
            const password_hash = data.password ? await bcryptjs_1.default.hash(data.password, 12) : null;
            return strapi.db.query(USER_UID).create({
                data: {
                    uuid: (0, uuid_1.v4)(),
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
        async findByIdentifier(identifier) {
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
        async findByUuid(uuid) {
            const user = await strapi.db.query(USER_UID).findOne({ where: { uuid } });
            return sanitize(user);
        },
        async verifyPassword(user, password) {
            if (!user.password_hash) {
                const raw = await strapi.db.query(USER_UID).findOne({ where: { id: user.id }, select: ["password_hash"] });
                if (!(raw === null || raw === void 0 ? void 0 : raw.password_hash))
                    return false;
                return bcryptjs_1.default.compare(password, raw.password_hash);
            }
            return bcryptjs_1.default.compare(password, user.password_hash);
        },
        async updateLoginInfo(userId, channelCode) {
            const current = await strapi.db.query(USER_UID).findOne({ where: { id: userId } });
            const updateData = {
                last_login_at: new Date(),
                login_count: ((current === null || current === void 0 ? void 0 : current.login_count) || 0) + 1,
            };
            if (channelCode) {
                updateData.last_login_channel = channelCode;
            }
            return strapi.db.query(USER_UID).update({
                where: { id: userId },
                data: updateData,
            });
        },
        async changePassword(userId, newPassword) {
            const password_hash = await bcryptjs_1.default.hash(newPassword, 12);
            return strapi.db.query(USER_UID).update({
                where: { id: userId },
                data: { password_hash, password_changed_at: new Date() },
            });
        },
        async isBlocked(user) {
            return user.status === "blocked";
        },
        async findById(id) {
            const user = await strapi.db.query(USER_UID).findOne({ where: { id } });
            return sanitize(user);
        },
        async bindContact(userId, type, identifier, password) {
            const updateData = {};
            if (type === "mobile")
                updateData.mobile = identifier;
            if (type === "email")
                updateData.email = identifier;
            if (type === "username")
                updateData.username = identifier;
            if (password)
                updateData.password_hash = await bcryptjs_1.default.hash(password, 12);
            return strapi.db.query(USER_UID).update({ where: { id: userId }, data: updateData });
        },
        async bindThirdParty(userId, providerData) {
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
        async unbindThirdParty(userId, provider) {
            return strapi.db.query("plugin::zhao-sso.sso-third-party-binding").delete({
                where: { user: { id: userId }, provider },
            });
        },
        async count(where) {
            return strapi.db.query(USER_UID).count({ where });
        },
        async findMany(params) {
            const users = await strapi.db.query(USER_UID).findMany({
                where: params.where || {},
                orderBy: params.orderBy || { created_at: "desc" },
                limit: params.limit,
                offset: params.offset,
            });
            return users.map(sanitize);
        },
        async findOneWithBindings(id) {
            const user = await strapi.db.query(USER_UID).findOne({
                where: { id },
                populate: { third_party_bindings: true },
            });
            return sanitize(user);
        },
        async updateAdmin(id, body) {
            const allowedFields = ["status", "nickname", "username"];
            const data = {};
            for (const field of allowedFields) {
                if (body[field] !== undefined)
                    data[field] = body[field];
            }
            const user = await strapi.db.query(USER_UID).update({ where: { id }, data });
            return sanitize(user);
        },
    };
};
