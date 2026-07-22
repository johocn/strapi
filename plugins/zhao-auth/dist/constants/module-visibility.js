"use strict";
/**
 * 模块可见性共享常量
 * 与前端 config-helper.js VISIBILITY_MODULES 和 DEFAULT_MODULE_VISIBILITY 保持完全一致
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MODULE_VISIBILITY = exports.VISIBILITY_MODULES = void 0;
// 13 个模块
exports.VISIBILITY_MODULES = [
    "website", "logistics", "studio", "points", "course", "quiz",
    "channel", "sso", "thirdParty", "oss", "payment", "community", "forum",
];
// 默认模块可见性（与前端 config-helper.js DEFAULT_MODULE_VISIBILITY 保持完全一致）
exports.DEFAULT_MODULE_VISIBILITY = {
    website: ["channel-admin", "plugin-manager", "website-manager", "website-editor"],
    logistics: ["channel-admin", "plugin-manager", "logistics-manager", "logistics-editor"],
    studio: ["channel-admin", "plugin-manager", "studio-manager", "studio-editor"],
    points: ["channel-admin", "plugin-manager", "point-manager", "point-editor"],
    course: ["channel-admin", "plugin-manager", "course-manager", "course-editor"],
    quiz: ["channel-admin", "plugin-manager", "quiz-manager", "quiz-editor"],
    channel: ["channel-admin", "plugin-manager", "marketing-manager"],
    sso: ["plugin-manager", "system-manager", "system-editor"],
    thirdParty: ["plugin-manager", "system-manager"],
    oss: ["plugin-manager", "system-manager"],
    payment: ["plugin-manager", "wealth-manager"],
    community: ["channel-admin", "plugin-manager", "marketing-manager"],
    forum: ["channel-admin", "plugin-manager", "marketing-manager"],
};
