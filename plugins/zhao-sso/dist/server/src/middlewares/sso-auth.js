"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = async (ctx, next) => {
    var _a, _b, _c, _d, _e, _f;
    const authHeader = (_b = (_a = ctx.request) === null || _a === void 0 ? void 0 : _a.headers) === null || _b === void 0 ? void 0 : _b.authorization;
    if (authHeader && typeof authHeader === "string") {
        const parts = authHeader.split(" ");
        if (parts.length === 2 && parts[0] === "Bearer") {
            try {
                const jwtService = (_f = (_e = (_d = (_c = ctx.strapi) === null || _c === void 0 ? void 0 : _c.plugin) === null || _d === void 0 ? void 0 : _d.call(_c, "zhao-sso")) === null || _e === void 0 ? void 0 : _e.service) === null || _f === void 0 ? void 0 : _f.call(_e, "sso-jwt");
                if (jwtService) {
                    const payload = await jwtService.verifyToken(parts[1]);
                    if (payload.type === "access") {
                        ctx.state.ssoUser = payload;
                        ctx.state.ssoToken = parts[1];
                    }
                }
            }
            catch { /* ignore */ }
        }
    }
    await next();
};
