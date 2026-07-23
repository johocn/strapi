declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_deal_platforms",
  "info": {
    "singularName": "platform",
    "pluralName": "platforms",
    "displayName": "平台管理",
    "description": "电商平台与同步配置"
  },
  "options": { "draftAndPublish": false, "comment": "" },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "name": { "type": "string", "required": true },
    "code": {
      "type": "enumeration",
      "required": true,
      "unique": true,
      "enum": ["taobao", "pdd", "douyin", "jd"]
    },
    "promoSite": { "type": "string" },
    "couponRule": { "type": "text" },
    "apiEndpoint": { "type": "string" },
    "appKey": { "type": "string" },
    "appSecret": { "type": "password" },
    "signRule": { "type": "string" },
    "syncEnabled": { "type": "boolean", "default": false },
    "syncMode": {
      "type": "enumeration",
      "enum": ["manual", "scheduled", "both"],
      "default": "manual"
    },
    "syncCron": { "type": "string" },
    "fetchConfig": { "type": "json" },
    "coupons": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-deal.coupon",
      "mappedBy": "platform"
    },
    "products": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-deal.product",
      "mappedBy": "platform"
    },
    "categories": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-deal.category",
      "mappedBy": "platform"
    }
  }
}
;

export default _default;
