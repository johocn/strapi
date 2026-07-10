declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_logistics_contact_matrices",
  "info": {
    "singularName": "contact-matrix",
    "pluralName": "contact-matrices",
    "displayName": "联系渠道矩阵"
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
      "inversedBy": "logistics_contact_matrices"
    },
    "lang": {
      "type": "enumeration",
      "enum": ["cn", "jp", "kr", "vn"],
      "required": true
    },
    "flag": {
      "type": "string",
      "maxLength": 10,
      "required": true
    },
    "short": {
      "type": "string",
      "maxLength": 10,
      "required": true
    },
    "primary": {
      "type": "json",
      "required": true,
      "localized": true
    },
    "channels": {
      "type": "json",
      "required": true,
      "localized": true
    },
    "hotline": {
      "type": "json",
      "required": true,
      "localized": true
    },
    "email": {
      "type": "email",
      "required": true
    },
    "callbackNote": {
      "type": "text",
      "localized": true
    },
    "isActive": {
      "type": "boolean",
      "default": true,
      "required": true
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
;

export default _default;
