declare const _default: {
  "kind": "collectionType",
  "collectionName": "wealth_navs",
  "info": {
    "singularName": "wealth-nav",
    "pluralName": "wealth-navs",
    "displayName": "净值数据",
    "description": "理财/基金净值数据（不含货币基金）"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "product": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-wealth.wealth-product", "inversedBy": "navs" },
    "navDate": { "type": "date", "required": true },
    "unitNav": { "type": "decimal", "precision": 10, "scale": 4 },
    "accNav": { "type": "decimal", "precision": 10, "scale": 4 },
    "dataSource": { "type": "enumeration", "enum": ["crawler", "manual"], "default": "crawler" },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
;

export default _default;
