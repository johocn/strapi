"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSIONS = void 0;
exports.PERMISSIONS = {
    'oss.file.upload': ['admin', 'channel-admin', 'course-manager', 'instructor', 'user'],
    'oss.file.read': ['admin', 'channel-admin', 'course-manager', 'instructor', 'user'],
    'oss.file.delete': ['admin', 'channel-admin'],
    'oss.folder.create': ['admin', 'channel-admin', 'course-manager'],
    'oss.folder.read': ['admin', 'channel-admin', 'course-manager', 'instructor', 'user'],
    'oss.settings.read': ['admin'],
    'oss.settings.update': ['admin'],
    'oss.sync.read': ['admin', 'channel-admin'],
    'oss.sync.create': ['admin', 'channel-admin'],
    'oss.sync.delete': ['admin'],
};
exports.default = exports.PERMISSIONS;
