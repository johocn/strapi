declare const _default: {
  "kind": "collectionType",
  "collectionName": "sso_user_profiles",
  "info": { "singularName": "sso-user-profile", "pluralName": "sso-user-profiles", "displayName": "SSO User Profile" },
  "options": { "draftAndPublish": false },
  "attributes": {
    "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" },
    "segment": { "type": "enumeration", "enum": ["S", "A", "B", "C"], "default": "C", "required": true },
    "segmentScore": { "type": "integer", "default": 0 },
    "segmentReason": { "type": "text" },
    "dimensions": { "type": "json", "default": {} },
    "lastCalculatedAt": { "type": "datetime" }
  }
}
;

export default _default;
