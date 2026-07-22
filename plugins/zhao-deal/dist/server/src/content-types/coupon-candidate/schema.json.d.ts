declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_deal_coupon_candidates",
  "info": {
    "singularName": "coupon-candidate",
    "pluralName": "coupon-candidates",
    "displayName": "优惠券候选",
    "description": "拉取候选池待审核"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "couponId": { "type": "uid", "required": true },
    "platform": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-deal.platform"
    },
    "category": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-deal.category"
    },
    "amountDesc": { "type": "string", "required": true },
    "couponAmount": { "type": "decimal" },
    "useCondition": { "type": "string" },
    "useScope": { "type": "string" },
    "startAt": { "type": "datetime" },
    "endAt": { "type": "datetime" },
    "receiveCount": { "type": "integer" },
    "usedCount": { "type": "integer" },
    "originalPrice": { "type": "decimal" },
    "onlineAt": { "type": "datetime" },
    "offlineAt": { "type": "datetime" },
    "promoLink": { "type": "text", "required": true },
    "fetchedAt": { "type": "datetime", "required": true },
    "status": {
      "type": "enumeration",
      "enum": ["pending", "approved", "rejected", "imported"],
      "default": "pending",
      "required": true
    },
    "rejectReason": { "type": "string" },
    "importedCoupon": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "plugin::zhao-deal.coupon"
    }
  }
}
;

export default _default;
