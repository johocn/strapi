declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_deal_coupon_collections",
  "info": {
    "singularName": "coupon-collection",
    "pluralName": "coupon-collections",
    "displayName": "优惠券合集",
    "description": "活动专题合集"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "name": { "type": "string", "required": true },
    "code": { "type": "string", "required": true, "unique": true },
    "description": { "type": "text" },
    "coverImage": { "type": "media", "allowedTypes": ["images"], "multiple": false },
    "coupons": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-deal.coupon",
      "mappedBy": "collection"
    },
    "startAt": { "type": "datetime" },
    "endAt": { "type": "datetime" },
    "sortOrder": { "type": "integer", "default": 0 },
    "status": { "type": "boolean", "default": true }
  }
}
;

export default _default;
