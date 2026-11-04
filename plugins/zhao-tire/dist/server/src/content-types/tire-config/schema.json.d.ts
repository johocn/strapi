declare const _default: {
  "kind": "singleType",
  "collectionName": "zhao_tire_config",
  "info": {
    "singularName": "tire-config",
    "pluralName": "tire-configs",
    "displayName": "站点配置"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "bannerTitle": {
      "type": "string"
    },
    "bannerSubtitle": {
      "type": "string"
    },
    "bannerImage": {
      "type": "media",
      "multiple": false,
      "allowedTypes": ["images"]
    },
    "serviceIntro": {
      "type": "richtext"
    },
    "warehouseConditions": {
      "type": "text"
    },
    "guarantees": {
      "type": "json"
    },
    "serviceAreaText": {
      "type": "text"
    },
    "warehouseAddress": {
      "type": "string"
    },
    "warehouseLat": {
      "type": "float"
    },
    "warehouseLng": {
      "type": "float"
    },
    "mapUrl": {
      "type": "string"
    },
    "contactPhone": {
      "type": "string"
    },
    "wechatQr": {
      "type": "media",
      "multiple": false,
      "allowedTypes": ["images"]
    },
    "dailyPickupLimitMorning": {
      "type": "integer",
      "default": 6
    },
    "dailyPickupLimitAfternoon": {
      "type": "integer",
      "default": 6
    },
    "paymentOnlineEnabled": {
      "type": "boolean",
      "default": false
    },
    "depositEnabled": {
      "type": "boolean",
      "default": false
    },
    "depositRatio": {
      "type": "integer",
      "default": 30
    },
    "referralRewardCap": {
      "type": "integer",
      "default": 6900
    },
    "referralRewardValidDays": {
      "type": "integer",
      "default": 365
    },
    "referralRewardYearLimit": {
      "type": "integer",
      "default": 4
    },
    "referralDailyBindLimit": {
      "type": "integer",
      "default": 5
    },
    "redemptionCodeEnabled": {
      "type": "boolean",
      "default": true
    },
    "agreementText": {
      "type": "richtext"
    },
    "maxStorageDate": {
      "type": "date"
    },
    "announcement": {
      "type": "string"
    },
    "smsTemplateOverride": {
      "type": "json"
    }
  }
}
;

export default _default;
