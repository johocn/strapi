declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_tags",
  "info": {
    "singularName": "tag",
    "pluralName": "tags",
    "displayName": "标签"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "i18n": { "localized": true }
  },
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "localized": true
    },
    "slug": {
      "type": "uid",
      "targetField": "name",
      "required": false,
      "localized": true
    },
    "description": {
      "type": "text",
      "localized": true
    },
    "color": {
      "type": "string"
    },
    "icon": {
      "type": "media",
      "multiple": false
    },
    "tagGroup": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-tag.tag-group",
      "inversedBy": "tags"
    },
    "parent": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-tag.tag",
      "inversedBy": "children"
    },
    "children": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-tag.tag",
      "mappedBy": "parent"
    },
    "sort": {
      "type": "integer",
      "default": 0
    },
    "isPreset": {
      "type": "boolean",
      "default": false
    },
    "isPublic": {
      "type": "boolean",
      "default": true
    },
    "site": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "inversedBy": "tags"
    },
    "indexes": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-tag.tag-index",
      "mappedBy": "tag"
    },
    "website_articles": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "plugin::zhao-website.article",
      "mappedBy": "tags"
    },
    "website_tutorials": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "plugin::zhao-website.tutorial",
      "mappedBy": "tags"
    },
    "website_cases": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "plugin::zhao-website.case",
      "mappedBy": "tags"
    },
    "website_faqs": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "plugin::zhao-website.faq",
      "mappedBy": "tags"
    },
    "website_compliances": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "plugin::zhao-website.compliance",
      "mappedBy": "tags"
    },
    "website_downloads": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "plugin::zhao-website.download",
      "mappedBy": "tags"
    },
    "website_products": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "plugin::zhao-website.product",
      "mappedBy": "tags"
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
};

export default _default;
