declare const _default: {
  "kind": "collectionType",
  "collectionName": "sso_tokens",
  "info": {
    "singularName": "sso-token",
    "pluralName": "sso-tokens",
    "displayName": "SSO Token"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" },
    "app_code": { "type": "string", "required": true },
    "access_token_jti": { "type": "text", "unique": true, "required": true },
    "refresh_token": { "type": "text", "unique": true, "required": true },
    "refresh_expires_at": { "type": "datetime", "required": true },
    "revoked": { "type": "boolean", "default": false, "required": true },
    "revoked_at": { "type": "datetime" },
    "channel_code": { "type": "string" }
  }
}
;

export default _default;
