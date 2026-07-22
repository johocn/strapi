declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_deal_product_candidates",
  "info": {
    "singularName": "product-candidate",
    "pluralName": "product-candidates",
    "displayName": "商品候选",
    "description": "拉取候选池待审核"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "productId": { "type": "uid", "required": true },
    "platform": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-deal.platform"
    },
    "title": { "type": "string", "required": true },
    "mainImage": { "type": "media", "allowedTypes": ["images"], "multiple": false },
    "detailUrl": { "type": "string" },
    "originalPrice": { "type": "decimal" },
    "couponAmount": { "type": "decimal" },
    "finalPrice": { "type": "decimal" },
    "sales30d": { "type": "integer" },
    "reviewCount": { "type": "integer" },
    "reviewScore": { "type": "decimal" },
    "brand": { "type": "string" },
    "category": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-deal.category"
    },
    "fetchedAt": { "type": "datetime", "required": true },
    "status": {
      "type": "enumeration",
      "enum": ["pending", "approved", "rejected", "imported"],
      "default": "pending",
      "required": true
    },
    "rejectReason": { "type": "string" },
    "importedProduct": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "plugin::zhao-deal.product"
    }
  }
}
;

export default _default;
