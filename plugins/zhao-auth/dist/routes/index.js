"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const content_api_1 = __importDefault(require("./content-api"));
const tenant_1 = __importDefault(require("./tenant"));
const module_visibility_1 = __importDefault(require("./module-visibility"));
exports.default = {
    "content-api": {
        type: "content-api",
        routes: (0, content_api_1.default)().routes,
    },
    tenant: {
        type: "content-api",
        routes: (0, tenant_1.default)().routes,
    },
    "module-visibility": {
        type: "content-api",
        routes: (0, module_visibility_1.default)().routes,
    },
};
