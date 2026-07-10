declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_logistics_reviews",
  "info": {
    "singularName": "review",
    "pluralName": "reviews",
    "displayName": "客户评价"
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
      "inversedBy": "logistics_reviews"
    },
    "authorName": {
      "type": "string",
      "maxLength": 100,
      "required": true,
      "localized": true
    },
    "authorCompany": {
      "type": "string",
      "maxLength": 100
    },
    "authorTitle": {
      "type": "string",
      "maxLength": 50
    },
    "authorCountry": {
      "type": "string",
      "maxLength": 10,
      "required": true
    },
    "routeId": {
      "type": "string",
      "maxLength": 50
    },
    "serviceProvider": {
      "type": "string",
      "maxLength": 50
    },
    "rating": {
      "type": "integer",
      "required": true
    },
    "content": {
      "type": "text",
      "required": true,
      "localized": true
    },
    "videoUrl": {
      "type": "string",
      "maxLength": 500
    },
    "videoPoster": {
      "type": "media",
      "multiple": false
    },
    "images": {
      "type": "media",
      "multiple": true
    },
    "testimonialType": {
      "type": "enumeration",
      "enum": ["text", "video", "case_study"],
      "default": "text",
      "required": true
    },
    "isVerified": {
      "type": "boolean",
      "default": false,
      "required": true
    },
    "isFeatured": {
      "type": "boolean",
      "default": false
    },
    "publishedAt": {
      "type": "datetime"
    },
    "status": {
      "type": "enumeration",
      "enum": ["pending", "approved", "rejected"],
      "default": "pending",
      "required": true
    },
    "replyContent": {
      "type": "text",
      "localized": true
    },
    "replyAt": {
      "type": "datetime"
    },
    "orderRef": {
      "type": "string",
      "maxLength": 50
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
;

export default _default;
