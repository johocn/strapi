"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const role_management_1 = __importDefault(require("./role-management"));
const auth_1 = __importDefault(require("./auth"));
const permission_1 = __importDefault(require("./permission"));
const role_channel_1 = __importDefault(require("./role-channel"));
const tenant_1 = __importDefault(require("./tenant"));
const module_visibility_1 = __importDefault(require("./module-visibility"));
exports.default = {
    "role-management": role_management_1.default,
    auth: auth_1.default,
    permission: permission_1.default,
    "role-channel": role_channel_1.default,
    tenant: tenant_1.default,
    "module-visibility": module_visibility_1.default,
};
