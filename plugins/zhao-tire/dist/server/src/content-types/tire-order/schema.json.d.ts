declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_tire_orders",
  "info": {
    "singularName": "tire-order",
    "pluralName": "tire-orders",
    "displayName": "寄存订单"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "orderNo": {
      "type": "string",
      "required": true,
      "unique": true
    },
    "clientToken": {
      "type": "string",
      "required": true,
      "unique": true
    },
    "source": {
      "type": "enumeration",
      "enum": ["h5"],
      "default": "h5"
    },
    "customerName": {
      "type": "string",
      "required": true
    },
    "phone": {
      "type": "string",
      "required": true
    },
    "plateNo": {
      "type": "string"
    },
    "carType": {
      "type": "enumeration",
      "enum": ["sedan", "suv", "pickup"]
    },
    "tireSpec": {
      "type": "string"
    },
    "withWheelRim": {
      "type": "boolean",
      "default": false
    },
    "serviceType": {
      "type": "enumeration",
      "enum": ["store", "pickup"],
      "required": true
    },
    "returnMethod": {
      "type": "enumeration",
      "enum": ["pickup_delivery"]
    },
    "pickupDate": {
      "type": "date"
    },
    "pickupSlot": {
      "type": "enumeration",
      "enum": ["morning", "afternoon"]
    },
    "storageStartDate": {
      "type": "date",
      "required": true
    },
    "expectedReturnDate": {
      "type": "date",
      "required": true
    },
    "expireAt": {
      "type": "date"
    },
    "months": {
      "type": "integer"
    },
    "packageSnapshot": {
      "type": "json"
    },
    "addons": {
      "type": "json"
    },
    "amountPackage": {
      "type": "integer",
      "default": 0
    },
    "amountAddon": {
      "type": "integer",
      "default": 0
    },
    "amountTotal": {
      "type": "integer",
      "default": 0
    },
    "paymentMethod": {
      "type": "enumeration",
      "enum": ["store_pay", "deposit", "full"],
      "default": "store_pay"
    },
    "paymentStatus": {
      "type": "enumeration",
      "enum": ["unpaid", "deposit_paid", "paid"],
      "default": "unpaid"
    },
    "paidAmount": {
      "type": "integer",
      "default": 0
    },
    "status": {
      "type": "enumeration",
      "enum": [
        "pending_accept",
        "accepted",
        "stored",
        "pending_outbound",
        "completed",
        "rejected",
        "canceled"
      ],
      "default": "pending_accept"
    },
    "outboundRequestStatus": {
      "type": "enumeration",
      "enum": ["none", "pending", "approved", "rejected"],
      "default": "none"
    },
    "outboundRequestedAt": {
      "type": "datetime"
    },
    "outboundNote": {
      "type": "text"
    },
    "inboundPhotos": {
      "type": "media",
      "multiple": true,
      "allowedTypes": ["images"]
    },
    "outboundPhotos": {
      "type": "media",
      "multiple": true,
      "allowedTypes": ["images"]
    },
    "locationCode": {
      "type": "string"
    },
    "inboundAt": {
      "type": "datetime"
    },
    "outboundAt": {
      "type": "datetime"
    },
    "storageOperator": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "admin::user"
    },
    "note": {
      "type": "text"
    },
    "agreementAcceptedAt": {
      "type": "datetime"
    },
    "renewals": {
      "type": "json"
    },
    "timeline": {
      "type": "json"
    }
  }
}
;

export default _default;
