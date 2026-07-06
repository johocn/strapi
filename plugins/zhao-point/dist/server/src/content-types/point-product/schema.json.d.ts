declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_point_products",
  "info": {
    "singularName": "point-product",
    "pluralName": "point-products",
    "displayName": "积分商品",
    "description": "积分商城商品"
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
    "name": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "subtitle": {
      "type": "string",
      "maxLength": 200
    },
    "description": {
      "type": "text"
    },
    "detail": {
      "type": "richtext"
    },
    "category": {
      "type": "string",
      "maxLength": 50
    },
    "coverImage": {
      "type": "media",
      "multiple": false,
      "required": false,
      "allowedTypes": ["images"]
    },
    "images": {
      "type": "media",
      "multiple": true,
      "required": false,
      "allowedTypes": ["images"]
    },
    "video": {
      "type": "media",
      "multiple": false,
      "required": false,
      "allowedTypes": ["videos"]
    },
    "pointsCost": {
      "type": "integer",
      "required": true
    },
    "originalPrice": {
      "type": "decimal",
      "precision": 10,
      "scale": 2
    },
    "stock": {
      "type": "integer",
      "default": 0
    },
    "totalStock": {
      "type": "integer",
      "default": 0
    },
    "deliveryType": {
      "type": "enumeration",
      "enum": ["self_pickup", "express", "both"],
      "required": true
    },
    "salesMode": {
      "type": "enumeration",
      "enum": ["points_only", "purchase_only", "hybrid"],
      "default": "points_only"
    },
    "price": {
      "type": "decimal",
      "precision": 10,
      "scale": 2
    },
    "channel": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-channel.channel"
    },
    "allowCrossChannel": {
      "type": "boolean",
      "default": false
    },
    "allowGlobalPoints": {
      "type": "boolean",
      "default": true
    },
    "status": {
      "type": "enumeration",
      "enum": ["on_shelf", "off_shelf"],
      "default": "on_shelf"
    },
    "maxPerUser": {
      "type": "integer",
      "default": 0
    },
    "sortOrder": {
      "type": "integer",
      "default": 0
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
;

export default _default;
