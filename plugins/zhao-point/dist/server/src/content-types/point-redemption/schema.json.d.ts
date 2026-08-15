declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_point_redemptions",
  "info": {
    "singularName": "point-redemption",
    "pluralName": "point-redemptions",
    "displayName": "积分兑换",
    "description": "用户积分兑换礼品记录"
  },
  "options": {
    "draftAndPublish": false,
    "comment": ""
  },
  "pluginOptions": {
    "content-manager": {
      "visible": true
    },
    "content-type-builder": {
      "visible": false
    }
  },
  "attributes": {
    "user": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user",
      "required": true
    },
    "product": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-point.point-product"
    },
    "itemName": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "pointsCost": {
      "type": "integer",
      "required": true
    },
    "quantity": {
      "type": "integer",
      "default": 1
    },
    "totalCost": {
      "type": "integer",
      "required": true
    },
    "status": {
      "type": "enumeration",
      "enum": ["pending", "approved", "rejected", "shipped", "completed", "cancelled"],
      "default": "pending"
    },
    "deliveryType": {
      "type": "enumeration",
      "enum": ["self_pickup", "express"]
    },
    "pickupCode": {
      "type": "string",
      "maxLength": 20
    },
    "pickupLocation": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-point.pickup-location"
    },
    "salesMode": {
      "type": "enumeration",
      "enum": ["points_only", "purchase_only", "hybrid"]
    },
    "priceAmount": {
      "type": "decimal",
      "precision": 10,
      "scale": 2
    },
    "pointsAmount": {
      "type": "integer"
    },
    "expressCompany": {
      "type": "string",
      "maxLength": 50
    },
    "trackingNumber": {
      "type": "string",
      "maxLength": 100
    },
    "receiverName": {
      "type": "string",
      "maxLength": 50
    },
    "receiverPhone": {
      "type": "string",
      "maxLength": 20
    },
    "receiverAddress": {
      "type": "text"
    },
    "remark": {
      "type": "text"
    },
    "operator": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "admin::user"
    },
    "completedAt": {
      "type": "datetime"
    },
    "channel": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-channel.channel"
    },
    "deductionDetail": {
      "type": "json"
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
;

export default _default;
