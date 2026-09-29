"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const rate_limit_1 = __importDefault(require("./rate-limit"));
const redirect_1 = __importDefault(require("./redirect"));
exports.default = {
    "rate-limit": rate_limit_1.default,
    "redirect": redirect_1.default,
};
//# sourceMappingURL=index.js.map