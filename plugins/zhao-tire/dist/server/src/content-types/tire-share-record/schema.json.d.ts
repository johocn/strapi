declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_tire_share_records",
  "info": {
    "singularName": "tire-share-record",
    "pluralName": "tire-share-records",
    "displayName": "分享邀请记录"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "shareCode": {
      "type": "string",
      "required": true,
      "maxLength": 12
    },
    "referrerPhone": {
      "type": "string",
      "required": true
    },
    "inviteePhone": {
      "type": "string"
    },
    "inviteeOpenid": {
      "type": "string",
      "maxLength": 128
    },
    "deviceId": {
      "type": "string",
      "maxLength": 128
    },
    "ip": {
      "type": "string",
      "maxLength": 64
    },
    "orderNo": {
      "type": "string",
      "maxLength": 40
    },
    "orderId": {
      "type": "integer"
    },
    "status": {
      "type": "enumeration",
      "enum": ["bound", "valid", "pending_review", "invalid", "rolled_back"],
      "default": "bound"
    },
    "dedupeKey": {
      "type": "string",
      "required": true,
      "unique": true,
      "maxLength": 160
    },
    "riskReason": {
      "type": "string",
      "maxLength": 255
    },
    "boundAt": {
      "type": "datetime"
    },
    "validAt": {
      "type": "datetime"
    }
  }
}
;

export default _default;
