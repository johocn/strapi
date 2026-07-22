"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const admin_1 = __importDefault(require("./admin"));
const api_1 = __importDefault(require("./api"));
exports.default = {
    "content-api": {
        type: "content-api",
        routes: [...(0, api_1.default)().routes, ...(0, admin_1.default)().routes],
    },
};
