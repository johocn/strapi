declare const _default: {
  "kind": "collectionType",
  "collectionName": "sso_wx_events",
  "info": {
    "singularName": "sso-wx-event",
    "pluralName": "sso-wx-events",
    "displayName": "SSO WeChat Event"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "openid": { "type": "string", "required": true },
    "event": {
      "type": "enumeration",
      "required": true,
      "enum": ["subscribe", "unsubscribe", "SCAN", "CLICK", "text", "other"]
    },
    "event_key": { "type": "string" },
    "scene_key": { "type": "string" },
    "payload": { "type": "json" },
    "openid_bound": { "type": "boolean", "default": false }
  }
};

export default _default;
