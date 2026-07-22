"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const schema_json_1 = __importDefault(require("./permission/schema.json"));
const schema_json_2 = __importDefault(require("./role-action-log/schema.json"));
const schema_json_3 = __importDefault(require("./role-channel/schema.json"));
exports.default = {
    permission: {
        schema: schema_json_1.default,
    },
    "role-action-log": {
        schema: schema_json_2.default,
    },
    "role-channel": {
        schema: schema_json_3.default,
    },
};
