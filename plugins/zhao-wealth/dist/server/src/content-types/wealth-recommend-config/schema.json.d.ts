declare const _default: {
  "kind": "collectionType",
  "collectionName": "wealth_recommend_configs",
  "info": {
    "singularName": "wealth-recommend-config",
    "pluralName": "wealth-recommend-configs",
    "displayName": "推荐配置",
    "description": "手动推荐产品配置"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "product": { "type": "relation", "relation": "oneToOne", "target": "plugin::zhao-wealth.wealth-product" },
    "channel": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-channel.channel" },
    "recommendOrder": { "type": "integer", "default": 0 },
    "recommendReason": { "type": "text" },
    "status": { "type": "boolean", "default": true },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
;

export default _default;
