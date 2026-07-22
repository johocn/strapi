"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    schema: {
        collectionName: "zhao_oss_media_metas",
        info: {
            singularName: "media-meta",
            pluralName: "media-metas",
            displayName: "Media Meta",
            description: "媒体业务元信息（租户/上传者/分类）",
        },
        options: { draftAndPublish: false },
        pluginOptions: {
            "content-manager": { visible: false },
            "content-type-builder": { visible: false },
        },
        attributes: {
            site: {
                type: "relation",
                relation: "manyToOne",
                target: "plugin::zhao-common.site-config",
                required: true,
            },
            file: {
                type: "relation",
                relation: "oneToOne",
                target: "plugin::upload.file",
                required: true,
            },
            fileId: { type: "integer", required: true },
            folder: {
                type: "relation",
                relation: "manyToOne",
                target: "plugin::upload.folder",
            },
            category: {
                type: "enumeration",
                enum: ["brand", "article", "product", "case", "compliance", "faq", "tutorial", "download", "avatar", "general", "other"],
                default: "general",
            },
            uploader: {
                type: "relation",
                relation: "manyToOne",
                target: "admin::user",
            },
            uploaderRole: { type: "string", maxLength: 50 },
            modifier: {
                type: "relation",
                relation: "manyToOne",
                target: "admin::user",
            },
            originalFilename: { type: "string", maxLength: 500 },
            mimeType: { type: "string", maxLength: 100 },
            fileSize: { type: "biginteger" },
            fileExt: { type: "string", maxLength: 20 },
            usageCount: { type: "integer", default: 0 },
            lastUsedAt: { type: "datetime" },
            isPublic: { type: "boolean", default: true },
            tags: { type: "json" },
            deletedAt: { type: "datetime", default: null },
        },
    },
};
