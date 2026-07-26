"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sso_authenticated_1 = __importDefault(require("./sso-authenticated"));
const fallback_authenticated_1 = __importDefault(require("./fallback-authenticated"));
const fallback_has_permission_1 = __importDefault(require("./fallback-has-permission"));
exports.default = {
    "sso-authenticated": sso_authenticated_1.default,
    "fallback-authenticated": fallback_authenticated_1.default,
    "fallback-has-permission": fallback_has_permission_1.default,
};
