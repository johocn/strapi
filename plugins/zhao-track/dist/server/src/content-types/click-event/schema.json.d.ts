declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_track_click_events",
  "info": {
    "singularName": "click-event",
    "pluralName": "click-events",
    "displayName": "点击事件",
    "description": "优惠券点击追踪"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "coupon": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-deal.coupon",
      "inversedBy": "clickEvents"
    },
    "sourceTag": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-track.source-tag",
      "inversedBy": "clickEvents"
    },
    "promoPid": { "type": "string" },
    "promoCampaign": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-studio.promo-campaign"
    },
    "abVariant": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-studio.ab-variant"
    },
    "deviceFingerprint": { "type": "string", "required": true },
    "clickedAt": { "type": "datetime", "required": true },
    "ip": { "type": "string" },
    "userAgent": { "type": "text" },
    "browser": { "type": "string" },
    "os": { "type": "string" },
    "device": { "type": "string" },
    "referer": { "type": "text" },
    "resolvedLink": { "type": "text" }
  }
}
;

export default _default;
