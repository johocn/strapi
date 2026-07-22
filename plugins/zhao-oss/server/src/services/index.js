"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const provider_registry_1 = __importDefault(require("./provider-registry"));
const sync_service_1 = __importDefault(require("./sync-service"));
const url_resolver_1 = __importDefault(require("./url-resolver"));
const media_service_1 = __importDefault(require("./media-service"));
exports.default = {
    "provider-registry": provider_registry_1.default,
    "sync-service": sync_service_1.default,
    "url-resolver": url_resolver_1.default,
    "media-service": media_service_1.default,
};
