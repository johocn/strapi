declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_website_brand_voices",
  "info": {
    "singularName": "brand-voice",
    "pluralName": "brand-voices",
    "displayName": "品牌话术"
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
      "required": false,
      "inversedBy": "website_brand_voices"
    },
    "name": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "category": {
      "type": "enumeration",
      "enum": ["tone", "style", "phrase", "disclaimer", "cta"],
      "required": true
    },
    "content": {
      "type": "richtext",
      "required": true
    },
    "variables": {
      "type": "json"
    },
    "status": {
      "type": "boolean",
      "default": true
    },
    "tags": {
      "type": "json"
    },
    "articles": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.article",
      "mappedBy": "brandVoiceRef"
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
};

export default _default;
