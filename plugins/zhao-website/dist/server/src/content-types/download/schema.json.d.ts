declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_website_downloads",
  "info": {
    "singularName": "download",
    "pluralName": "downloads",
    "displayName": "下载文件管理"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "i18n": { "localized": true },
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true,
      "inversedBy": "website_downloads"
    },
    "name": {
      "type": "string",
      "maxLength": 200,
      "required": true,
      "localized": true
    },
    "description": {
      "type": "text",
      "localized": true
    },
    "file": {
      "type": "media",
      "required": true
    },
    "fileType": {
      "type": "enumeration",
      "enum": ["whitepaper", "brochure", "datasheet", "template", "guide", "certificate", "other"],
      "default": "other"
    },
    "fileSize": {
      "type": "biginteger"
    },
    "category": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-website.article-category",
      "inversedBy": "downloads"
    },
    "tags": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "plugin::zhao-tag.tag",
      "inversedBy": "website_downloads"
    },
    "relatedContentType": {
      "type": "string",
      "maxLength": 30
    },
    "relatedContentId": {
      "type": "string"
    },
    "requireLead": {
      "type": "boolean",
      "default": true
    },
    "downloadCount": {
      "type": "biginteger",
      "default": 0
    },
    "isFeatured": {
      "type": "boolean",
      "default": false
    },
    "order": {
      "type": "integer",
      "default": 0
    },
    "status": {
      "type": "enumeration",
      "enum": ["draft", "published", "archived"],
      "default": "draft"
    },
    "publishedAt": {
      "type": "datetime"
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
;

export default _default;
