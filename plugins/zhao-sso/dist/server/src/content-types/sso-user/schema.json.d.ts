declare const _default: {
  "kind": "collectionType",
  "collectionName": "sso_users",
  "info": {
    "singularName": "sso-user",
    "pluralName": "sso-users",
    "displayName": "SSO User"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "uuid": { "type": "string", "unique": true, "required": true },
    "username": { "type": "string", "unique": true },
    "mobile": { "type": "string", "unique": true },
    "email": { "type": "email", "unique": true },
    "password_hash": { "type": "string" },
    "avatar_url": { "type": "string" },
    "nickname": { "type": "string" },
    "status": { "type": "enumeration", "enum": ["active", "blocked", "inactive"], "default": "active", "required": true },
    "register_channel": { "type": "string" },
    "last_login_channel": { "type": "string" },
    "invite_code_used": { "type": "string" },
    "invited_by": { "type": "integer" },
    "utm_source": { "type": "string" },
    "utm_medium": { "type": "string" },
    "utm_campaign": { "type": "string" },
    "last_login_at": { "type": "datetime" },
    "login_count": { "type": "integer", "default": 0, "required": true },
    "password_changed_at": { "type": "datetime" },
    "third_party_bindings": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-sso.sso-third-party-binding", "mappedBy": "user" }
  }
}
;

export default _default;
