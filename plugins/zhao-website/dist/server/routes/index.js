"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const content_api_1 = __importDefault(require("./content-api"));
const admin_api_1 = __importDefault(require("./admin-api"));
exports.default = {
    "content-api": {
        type: "content-api",
        routes: [...(0, content_api_1.default)().routes, ...(0, admin_api_1.default)().routes],
    },
};
//# sourceMappingURL=index.js.map