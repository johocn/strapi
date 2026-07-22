declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_promo_channels",
  "info": {
    "singularName": "promo-channel",
    "pluralName": "promo-channels",
    "displayName": "推广渠道",
    "description": "推广渠道管理"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "name": { "type": "string", "required": true, "maxLength": 100 },
    "code": { "type": "string", "required": true, "unique": true },
    "description": { "type": "text" },
    "scene": {
      "type": "enumeration",
      "enum": ["wechat_group", "short_video", "live_stream", "poster", "article", "other"],
      "default": "other"
    },
    "status": { "type": "boolean", "default": true },
    "budget": { "type": "decimal" },
    "actualCost": { "type": "decimal" },
    "sortOrder": { "type": "integer", "default": 0 },
    "platformConfigs": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-studio.channel-platform-config",
      "mappedBy": "channel"
    },
    "campaigns": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-studio.promo-campaign",
      "mappedBy": "channel"
    },
    "experiments": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-studio.ab-experiment",
      "mappedBy": "channel"
    },
    "coupons": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "plugin::zhao-deal.coupon",
      "mappedBy": "promoChannels"
    }
  }
}
;

export default _default;
