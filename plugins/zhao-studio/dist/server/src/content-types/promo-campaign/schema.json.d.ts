declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_promo_campaigns",
  "info": {
    "singularName": "promo-campaign",
    "pluralName": "promo-campaigns",
    "displayName": "营销活动",
    "description": "有时间范围的营销活动"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "name": { "type": "string", "required": true, "maxLength": 100 },
    "code": { "type": "string", "required": true, "unique": true },
    "channel": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-studio.promo-channel",
      "inversedBy": "campaigns"
    },
    "description": { "type": "text" },
    "startAt": { "type": "datetime", "required": true },
    "endAt": { "type": "datetime", "required": true },
    "status": { "type": "boolean", "default": true },
    "budget": { "type": "decimal" },
    "actualCost": { "type": "decimal" },
    "experiments": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-studio.ab-experiment",
      "mappedBy": "campaign"
    }
  }
}
;

export default _default;
