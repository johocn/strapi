declare const _default: {
  "kind": "collectionType",
  "collectionName": "sso_third_party_bindings",
  "info": {
    "singularName": "sso-third-party-binding",
    "pluralName": "sso-third-party-bindings",
    "displayName": "SSO Third Party Binding"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user", "inversedBy": "third_party_bindings" },
    "provider": { "type": "string", "required": true },
    "provider_user_id": { "type": "string", "required": true },
    "provider_union_id": { "type": "string" },
    "provider_nickname": { "type": "string" },
    "provider_avatar": { "type": "string" },
    "provider_data": { "type": "json" },
    "bound_at": { "type": "datetime", "required": true },
    "subscribe": { "type": "integer" },
    "subscribe_at": { "type": "datetime" },
    "subscribe_check_at": { "type": "datetime" }
  }
}
;

export default _default;
