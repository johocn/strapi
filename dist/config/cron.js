"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cron_1 = __importDefault(require("../plugins/zhao-logistics/server/src/config/cron"));
const cron_2 = __importDefault(require("../plugins/zhao-track/server/src/config/cron"));
const cron_3 = __importDefault(require("../plugins/zhao-deal/server/src/config/cron"));
exports.default = {
    ...cron_1.default,
    ...cron_2.default,
    ...cron_3.default,
};
