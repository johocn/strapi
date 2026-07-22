"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sync_record_1 = __importDefault(require("./sync-record"));
const media_meta_1 = __importDefault(require("./media-meta"));
exports.default = {
    "sync-record": sync_record_1.default,
    "media-meta": media_meta_1.default,
};
