declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_ab_variants",
  "info": {
    "singularName": "ab-variant",
    "pluralName": "ab-variants",
    "displayName": "AB变体",
    "description": "A/B 测试变体"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "experiment": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-studio.ab-experiment",
      "inversedBy": "variants"
    },
    "name": { "type": "string", "required": true, "maxLength": 100 },
    "weight": { "type": "integer", "required": true, "default": 1 },
    "article": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-studio.article-draft"
    },
    "coupon": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-deal.coupon"
    },
    "description": { "type": "text" }
  }
}
;

export default _default;
