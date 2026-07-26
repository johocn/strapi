"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sso_authenticated_1 = __importDefault(require("./policies/sso-authenticated"));
const register = ({ strapi }) => {
    const policyRegistry = strapi.get("policies");
    policyRegistry.add("plugin::zhao-sso", {
        "sso-authenticated": sso_authenticated_1.default,
    });
    strapi.log.info("[zhao-sso] Plugin registered, policies added to registry");
};
exports.default = register;
