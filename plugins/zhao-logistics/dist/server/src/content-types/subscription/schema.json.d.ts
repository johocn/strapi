declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_logistics_subscriptions",
  "info": {
    "singularName": "subscription",
    "pluralName": "subscriptions",
    "displayName": "通知订阅"
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
      "inversedBy": "logistics_subscriptions"
    },
    "subscriberType": {
      "type": "enumeration",
      "enum": ["tracking_update", "quote_reply", "promotion", "newsletter"],
      "required": true
    },
    "channel": {
      "type": "enumeration",
      "enum": ["email", "line", "kakao", "zalo", "wechat", "sms"],
      "required": true
    },
    "channelTarget": {
      "type": "string",
      "maxLength": 200,
      "required": true
    },
    "trackingNo": {
      "type": "string",
      "maxLength": 50
    },
    "quoteRequestId": {
      "type": "string"
    },
    "eventFilter": {
      "type": "json"
    },
    "frequency": {
      "type": "enumeration",
      "enum": ["realtime", "daily", "weekly"],
      "default": "realtime",
      "required": true
    },
    "isActive": {
      "type": "boolean",
      "default": true,
      "required": true
    },
    "subscribedAt": {
      "type": "datetime",
      "required": true
    },
    "unsubscribedAt": {
      "type": "datetime"
    },
    "language": {
      "type": "string",
      "maxLength": 10,
      "required": true
    },
    "lastNotifiedAt": {
      "type": "datetime"
    },
    "notifyCount": {
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
