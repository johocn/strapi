"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePermission = exports.validatePermissionFormat = exports.getEffectiveRoles = exports.hasAnyRole = exports.hasPermission = void 0;
const services_1 = __importDefault(require("./services"));
const middlewares_1 = __importDefault(require("./middlewares"));
const controllers_1 = __importDefault(require("./controllers"));
const content_types_1 = __importDefault(require("./content-types"));
const policies_1 = __importDefault(require("./policies"));
const bootstrap_1 = __importDefault(require("./bootstrap"));
const register_1 = __importDefault(require("./register"));
const destroy_1 = __importDefault(require("./destroy"));
const config_1 = __importDefault(require("./config"));
const routes_1 = __importDefault(require("./routes"));
var permission_helpers_1 = require("./utils/permission-helpers");
Object.defineProperty(exports, "hasPermission", { enumerable: true, get: function () { return permission_helpers_1.hasPermission; } });
Object.defineProperty(exports, "hasAnyRole", { enumerable: true, get: function () { return permission_helpers_1.hasAnyRole; } });
Object.defineProperty(exports, "getEffectiveRoles", { enumerable: true, get: function () { return permission_helpers_1.getEffectiveRoles; } });
Object.defineProperty(exports, "validatePermissionFormat", { enumerable: true, get: function () { return permission_helpers_1.validatePermissionFormat; } });
Object.defineProperty(exports, "parsePermission", { enumerable: true, get: function () { return permission_helpers_1.parsePermission; } });
exports.default = {
    register: register_1.default,
    bootstrap: bootstrap_1.default,
    destroy: destroy_1.default,
    config: config_1.default,
    services: services_1.default,
    controllers: controllers_1.default,
    contentTypes: content_types_1.default,
    policies: policies_1.default,
    middlewares: middlewares_1.default,
    routes: routes_1.default,
};
