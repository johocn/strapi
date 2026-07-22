"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth_service_1 = __importDefault(require("./auth.service"));
const jwt_service_1 = __importDefault(require("./jwt.service"));
const role_management_service_1 = __importDefault(require("./role-management.service"));
const permission_service_1 = __importDefault(require("./permission.service"));
const channel_scope_service_1 = __importDefault(require("./channel-scope.service"));
const role_channel_service_1 = __importDefault(require("./role-channel.service"));
const tenant_service_1 = __importDefault(require("./tenant.service"));
exports.default = {
    auth: auth_service_1.default,
    jwt: jwt_service_1.default,
    "role-management": role_management_service_1.default,
    permission: permission_service_1.default,
    "channel-scope": channel_scope_service_1.default,
    "role-channel": role_channel_service_1.default,
    tenant: tenant_service_1.default,
};
