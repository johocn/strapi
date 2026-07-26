"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
exports.default = ({ strapi }) => {
    function throwErr(code, status, message) {
        const e = new Error(message);
        e.code = code;
        e.status = status;
        throw e;
    }
    const getSecret = () => {
        var _a;
        const pluginConfig = strapi.config.get("plugin::zhao-sso");
        const secret = ((_a = pluginConfig === null || pluginConfig === void 0 ? void 0 : pluginConfig.jwt) === null || _a === void 0 ? void 0 : _a.secret) || process.env.SSO_JWT_SECRET;
        if (!secret)
            throwErr("SSO_JWT_001", 500, "[zhao-sso] JWT secret not configured. Set SSO_JWT_SECRET env.");
        return secret;
    };
    const getAlgorithm = () => {
        var _a;
        const pluginConfig = strapi.config.get("plugin::zhao-sso");
        return (((_a = pluginConfig === null || pluginConfig === void 0 ? void 0 : pluginConfig.jwt) === null || _a === void 0 ? void 0 : _a.algorithm) || "HS256");
    };
    const getAccessTokenExpiry = () => {
        var _a;
        const pluginConfig = strapi.config.get("plugin::zhao-sso");
        return ((_a = pluginConfig === null || pluginConfig === void 0 ? void 0 : pluginConfig.jwt) === null || _a === void 0 ? void 0 : _a.accessTokenExpiresIn) || "15m";
    };
    const getRefreshTokenExpiry = () => {
        var _a;
        const pluginConfig = strapi.config.get("plugin::zhao-sso");
        return ((_a = pluginConfig === null || pluginConfig === void 0 ? void 0 : pluginConfig.jwt) === null || _a === void 0 ? void 0 : _a.refreshTokenExpiresIn) || "30d";
    };
    const signAccessToken = async (payload) => {
        const signPayload = {
            ...payload,
            type: "access",
            jti: (0, uuid_1.v4)(),
        };
        const options = {
            algorithm: getAlgorithm(),
            expiresIn: getAccessTokenExpiry(),
        };
        return jsonwebtoken_1.default.sign(signPayload, getSecret(), options);
    };
    const signRefreshToken = async (payload) => {
        const signPayload = {
            ...payload,
            type: "refresh",
            jti: (0, uuid_1.v4)(),
        };
        const options = {
            algorithm: getAlgorithm(),
            expiresIn: getRefreshTokenExpiry(),
        };
        return jsonwebtoken_1.default.sign(signPayload, getSecret(), options);
    };
    const signTokenPair = async (payload) => {
        const [accessToken, refreshToken] = await Promise.all([
            signAccessToken(payload),
            signRefreshToken(payload),
        ]);
        const decoded = jsonwebtoken_1.default.decode(accessToken);
        const expiresIn = decoded.exp - decoded.iat;
        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: expiresIn,
            token_type: "Bearer",
        };
    };
    const verifyToken = async (token) => {
        return jsonwebtoken_1.default.verify(token, getSecret(), { algorithms: [getAlgorithm()] });
    };
    const extractToken = (ctx) => {
        var _a, _b, _c;
        const authHeader = ((_b = (_a = ctx.request) === null || _a === void 0 ? void 0 : _a.headers) === null || _b === void 0 ? void 0 : _b.authorization) || ((_c = ctx.headers) === null || _c === void 0 ? void 0 : _c.authorization);
        if (!authHeader || typeof authHeader !== "string")
            return null;
        const parts = authHeader.split(" ");
        if (parts.length !== 2 || parts[0] !== "Bearer")
            return null;
        return parts[1];
    };
    return {
        getSecret,
        signAccessToken,
        signRefreshToken,
        signTokenPair,
        verifyToken,
        extractToken,
    };
};
