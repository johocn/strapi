declare const _default: {
  "kind": "collectionType",
  "collectionName": "sso_invite_usages",
  "info": {
    "singularName": "sso-invite-usage",
    "pluralName": "sso-invite-usages",
    "displayName": "SSO Invite Usage"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "invite_code": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-invite-code" },
    "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" },
    "channel_code": { "type": "string" },
    "app_code": { "type": "string" },
    "used_at": { "type": "datetime", "required": true }
  }
}
;

export default _default;
