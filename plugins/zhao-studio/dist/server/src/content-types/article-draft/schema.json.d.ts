declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_article_drafts",
  "info": {
    "singularName": "article-draft",
    "pluralName": "article-drafts",
    "displayName": "草稿文章",
    "description": "采集并加工后的草稿文章"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {
    "content-manager": {
      "visible": true
    },
    "content-type-builder": {
      "visible": true
    }
  },
  "attributes": {
    "title": {
      "type": "string",
      "required": true,
      "maxLength": 200
    },
    "content": {
      "type": "richtext",
      "required": true
    },
    "sourceUrl": {
      "type": "string"
    },
    "sourceTitle": {
      "type": "string"
    },
    "sourcePublishedAt": {
      "type": "datetime"
    },
    "sourceAuthor": {
      "type": "string"
    },
    "category": {
      "type": "string"
    },
    "status": {
      "type": "enumeration",
      "enum": ["draft", "processing", "ready", "published"],
      "default": "draft"
    },
    "aiProcessed": {
      "type": "boolean",
      "default": false
    },
    "aiSummary": {
      "type": "text"
    },
    "aiOptimizedTitle": {
      "type": "string"
    },
    "publishRecords": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-studio.publish-record",
      "mappedBy": "article"
    },
    "browserLogs": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-studio.browser-log",
      "mappedBy": "article"
    },
    "statSummaries": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-studio.stat-summary",
      "mappedBy": "article"
    },
    "websiteArticles": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.article",
      "mappedBy": "sourceArticleDraft"
    },
    "syncEvents": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-studio.sync-event",
      "mappedBy": "targetDraftId"
    },
    "scope": {
      "type": "enumeration",
      "enum": ["current", "global", "tenant"],
      "default": "current"
    },
    "scopeTenantId": {
      "type": "string"
    },
    "publishedAt": {
      "type": "datetime"
    },
    "createdAt": {
      "type": "datetime"
    },
    "updatedAt": {
      "type": "datetime"
    }
  }
};

export default _default;
