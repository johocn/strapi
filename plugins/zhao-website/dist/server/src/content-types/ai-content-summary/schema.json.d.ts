declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_website_ai_summaries",
  "info": {
    "singularName": "ai-content-summary",
    "pluralName": "ai-content-summaries",
    "displayName": "机器可读摘要"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true,
      "inversedBy": "website_ai_summaries"
    },
    "targetType": {
      "type": "string",
      "maxLength": 30,
      "required": true
    },
    "targetId": {
      "type": "string",
      "required": true
    },
    "summaryType": {
      "type": "enumeration",
      "enum": [
        "tldr",
        "key_facts",
        "faq",
        "qa_pairs",
        "technical_spec",
        "executive_brief",
        "comparison",
        "howto"
      ],
      "required": true
    },
    "content": {
      "type": "json",
      "required": true
    },
    "contentText": {
      "type": "text"
    },
    "language": {
      "type": "string",
      "maxLength": 10,
      "default": "zh-CN"
    },
    "version": {
      "type": "integer",
      "default": 1
    },
    "generatedBy": {
      "type": "enumeration",
      "enum": ["manual", "ai_assisted", "ai_generated", "hybrid"],
      "default": "manual"
    },
    "aiProvider": {
      "type": "string",
      "maxLength": 50
    },
    "aiModel": {
      "type": "string",
      "maxLength": 100
    },
    "generatedAt": {
      "type": "datetime"
    },
    "verifiedAt": {
      "type": "datetime"
    },
    "verificationStatus": {
      "type": "enumeration",
      "enum": ["verified", "pending", "outdated", "conflict"],
      "default": "verified"
    },
    "status": {
      "type": "boolean",
      "default": true
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
;

export default _default;
