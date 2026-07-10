declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_logistics_intent_orders",
  "info": {
    "singularName": "intent-order",
    "pluralName": "intent-orders",
    "displayName": "意向订单"
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
      "inversedBy": "logistics_intent_orders"
    },
    "orderNo": {
      "type": "string",
      "maxLength": 50,
      "required": true
    },
    "quoteRequestId": {
      "type": "string",
      "required": true
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
    "confirmedPrice": {
      "type": "json",
      "required": true
    },
    "cargoSummary": {
      "type": "json",
      "required": true
    },
    "routeSummary": {
      "type": "json",
      "required": true
    },
    "plannedShipDate": {
      "type": "date"
    },
    "actualShipDate": {
      "type": "date"
    },
    "status": {
      "type": "enumeration",
      "enum": ["intent", "confirmed", "shipping", "delivered", "cancelled"],
      "default": "intent",
      "required": true
    },
    "assignedTo": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "admin::user"
    },
    "followUpRecords": {
      "type": "json"
    },
    "contractSigned": {
      "type": "boolean",
      "default": false
    },
    "depositPaid": {
      "type": "boolean",
      "default": false
    },
    "depositAmount": {
      "type": "decimal"
    },
    "convertedToOrderId": {
      "type": "string"
    },
    "remark": {
      "type": "text"
    },
    "leadId": {
      "type": "string"
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
;

export default _default;
