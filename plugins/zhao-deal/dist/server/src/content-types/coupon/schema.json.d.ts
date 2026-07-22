declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_deal_coupons",
  "info": {
    "singularName": "coupon",
    "pluralName": "coupons",
    "displayName": "优惠券",
    "description": "正式优惠券库"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "couponId": { "type": "uid", "required": true, "unique": true },
    "platform": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-deal.platform",
      "inversedBy": "coupons"
    },
    "category": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-deal.category",
      "inversedBy": "coupons"
    },
    "promoLink": { "type": "text", "required": true },
    "amountDesc": { "type": "string", "required": true },
    "useRule": { "type": "text" },
    "useCondition": { "type": "string" },
    "useScope": { "type": "string" },
    "startAt": { "type": "datetime" },
    "endAt": { "type": "datetime" },
    "receiveCount": { "type": "integer", "default": 0 },
    "usedCount": { "type": "integer", "default": 0 },
    "originalPrice": { "type": "decimal" },
    "onlineAt": { "type": "datetime" },
    "offlineAt": { "type": "datetime" },
    "isRecommended": { "type": "boolean", "default": false },
    "isHot": { "type": "boolean", "default": false },
    "isNew": { "type": "boolean", "default": false },
    "sortOrder": { "type": "integer", "default": 0 },
    "promoChannels": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "plugin::zhao-studio.promo-channel",
      "inversedBy": "coupons"
    },
    "collection": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-deal.coupon-collection",
      "inversedBy": "coupons"
    }
  }
}
;

export default _default;
