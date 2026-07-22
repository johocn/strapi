declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_deal_categories",
  "info": {
    "singularName": "category",
    "pluralName": "categories",
    "displayName": "商品分类",
    "description": "商品类目管理"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "name": { "type": "string", "required": true },
    "code": { "type": "string", "required": true, "unique": true },
    "platform": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-deal.platform",
      "inversedBy": "categories"
    },
    "sort": { "type": "integer", "default": 0 },
    "icon": { "type": "media", "allowedTypes": ["images"], "multiple": false }
  }
}
;

export default _default;
