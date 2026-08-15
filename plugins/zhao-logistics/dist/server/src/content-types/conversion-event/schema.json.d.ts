declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_logistics_conversion_events",
  "info": {
    "singularName": "conversion-event",
    "pluralName": "conversion-events",
    "displayName": "转化事件"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true,
      "inversedBy": "logistics_conversion_events"
    },
    "funnel": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-logistics.conversion-funnel",
      "required": true,
      "inversedBy": "events"
    },
    "eventName": {
      "type": "string",
      "maxLength": 50,
      "required": true
    },
    "step": {
      "type": "integer",
      "required": true
    },
    "visitorId": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "user": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user"
    },
    "sessionId": {
      "type": "string",
      "maxLength": 100
    },
    "landingPageId": {
      "type": "string"
    },
    "quoteRequestId": {
      "type": "string"
    },
    "utmSource": {
      "type": "string",
      "maxLength": 100
    },
    "utmMedium": {
      "type": "string",
      "maxLength": 100
    },
    "utmCampaign": {
      "type": "string",
      "maxLength": 100
    },
    "lang": {
      "type": "string",
      "maxLength": 10
    },
    "ipAddress": {
      "type": "string",
      "maxLength": 45
    },
    "userAgent": {
      "type": "string",
      "maxLength": 500
    },
    "occurredAt": {
      "type": "datetime",
      "required": true
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
;

export default _default;
