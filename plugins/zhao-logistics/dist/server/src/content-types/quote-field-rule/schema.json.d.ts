declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_logistics_quote_field_rules",
  "info": {
    "singularName": "quote-field-rule",
    "pluralName": "quote-field-rules",
    "displayName": "询价动态字段规则"
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
      "inversedBy": "logistics_quote_field_rules"
    },
    "name": {
      "type": "string",
      "maxLength": 100,
      "required": true,
      "localized": true
    },
    "routeId": {
      "type": "string",
      "maxLength": 50
    },
    "serviceProvider": {
      "type": "string",
      "maxLength": 50
    },
    "customerType": {
      "type": "enumeration",
      "enum": ["individual", "business", "fba_seller"]
    },
    "isActive": {
      "type": "boolean",
      "default": true,
      "required": true
    },
    "priority": {
      "type": "integer",
      "default": 0
    },
    "fields": {
      "type": "json",
      "required": true,
      "localized": true
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
;

export default _default;
