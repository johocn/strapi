"use strict";
/**
 * 统一权限定义格式
 * 提供标准化的权限结构和类型定义
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_ROLES = exports.STANDARD_PERMISSIONS = void 0;
exports.STANDARD_PERMISSIONS = {
    create: 'create',
    read: 'read',
    update: 'update',
    delete: 'delete',
    publish: 'publish',
    export: 'export',
    import: 'import',
};
exports.ALL_ROLES = ['admin', 'channel-admin', 'plugin-manager', 'instructor', 'user'];
