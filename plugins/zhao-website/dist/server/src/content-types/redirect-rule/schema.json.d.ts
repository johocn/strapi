declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_website_redirect_rules",
  "info": {
    "singularName": "redirect-rule",
    "pluralName": "redirect-rules",
    "displayName": "重定向规则"
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
      "inversedBy": "website_redirect_rules"
    },
    "fromPath": {
      "type": "string",
      "required": true,
      "maxLength": 500
    },
    "toUrl": {
      "type": "string",
      "required": true,
      "maxLength": 500
    },
    "statusCode": {
      "type": "integer",
      "default": 301
    },
    "isActive": {
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
