declare const _default: {
  "kind": "collectionType",
  "collectionName": "sso_follow_ups",
  "info": { "singularName": "sso-follow-up", "pluralName": "sso-follow-ups", "displayName": "SSO Follow Up" },
  "options": { "draftAndPublish": false },
  "attributes": {
    "partner": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user", "required": true },
    "customer": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user", "required": true },
    "content": { "type": "text", "required": true },
    "status": { "type": "enumeration", "enum": ["todo", "done", "cancelled"], "default": "todo", "required": true },
    "nextFollowAt": { "type": "datetime" }
  }
}
;

export default _default;
