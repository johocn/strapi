export default {
  schema: {
    collectionName: "zhao_oss_sync_records",
    info: {
      singularName: "sync-record",
      pluralName: "sync-records",
      displayName: "Sync Record",
      description: "OSS 同步记录，追踪文件备份状态",
    },
    options: {
      draftAndPublish: false,
    },
    pluginOptions: {
      "content-manager": {
        visible: false,
      },
      "content-type-builder": {
        visible: false,
      },
    },
    attributes: {
      fileId: {
        type: "integer",
        required: true,
        unique: true,
      },
      fileHash: {
        type: "string",
        required: true,
      },
      status: {
        type: "enumeration",
        enum: ["pending", "syncing", "success", "failed", "skipped", "deleted"],
        default: "pending",
        required: true,
      },
      provider: {
        type: "string",
        required: true,
      },
      remoteUrl: {
        type: "string",
      },
      remoteEtag: {
        type: "string",
      },
      errorMessage: {
        type: "text",
      },
      retryCount: {
        type: "integer",
        default: 0,
        min: 0,
      },
      lastSyncedAt: {
        type: "datetime",
      },
    },
  },
};
