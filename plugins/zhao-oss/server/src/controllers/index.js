"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sync_controller_1 = __importDefault(require("./sync-controller"));
const settings_controller_1 = __importDefault(require("./settings-controller"));
const api_controller_1 = __importDefault(require("./api-controller"));
exports.default = {
    "sync-controller": sync_controller_1.default,
    "settings-controller": settings_controller_1.default,
    "api-controller": api_controller_1.default,
};
