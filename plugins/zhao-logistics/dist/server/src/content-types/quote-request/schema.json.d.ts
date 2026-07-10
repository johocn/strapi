declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_logistics_quote_requests",
  "info": {
    "singularName": "quote-request",
    "pluralName": "quote-requests",
    "displayName": "物流询价单"
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
      "inversedBy": "logistics_quote_requests"
    },
    "trackingNo": {
      "type": "string",
      "maxLength": 50
    },
    "routeId": {
      "type": "string",
      "maxLength": 50,
      "required": true
    },
    "origin": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "destination": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "serviceProvider": {
      "type": "string",
      "maxLength": 50
    },
    "cargoType": {
      "type": "string",
      "maxLength": 50,
      "required": true
    },
    "weight": {
      "type": "decimal",
      "required": true
    },
    "volume": {
      "type": "decimal"
    },
    "formData": {
      "type": "json",
      "required": true
    },
    "quotedPrice": {
      "type": "json"
    },
    "status": {
      "type": "enumeration",
      "enum": ["draft", "submitted", "quoted", "accepted", "rejected", "expired"],
      "default": "submitted",
      "required": true
    },
    "leadId": {
      "type": "string"
    },
    "customerName": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "customerContact": {
      "type": "string",
      "maxLength": 200,
      "required": true
    },
    "customerType": {
      "type": "enumeration",
      "enum": ["individual", "business", "fba_seller"]
    },
    "utmSource": {
      "type": "string",
      "maxLength": 100
    },
    "utmMedium": {
      "type": "string",
      "maxLength": 100
    },
    "utmCampaign": {
      "type": "string",
      "maxLength": 100
    },
    "lang": {
      "type": "string",
      "maxLength": 10,
      "required": true
    },
    "remark": {
      "type": "text"
    },
    "expiresAt": {
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
