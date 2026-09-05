declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_website_invite_traces",
  "info": {
    "singularName": "invite-trace",
    "pluralName": "invite-traces",
    "displayName": "邀请码流转埋点"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": false },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "event": {
      "type": "enumeration",
      "enum": ["share_sent", "landing", "login_start", "login_callback", "redirect_back", "use_invite"],
      "required": true
    },
    "inviteCode": { "type": "string", "maxLength": 100 },
    "storedCode": { "type": "string", "maxLength": 100 },
    "channelInviteCode": { "type": "string", "maxLength": 100 },
    "inviterId": { "type": "string", "maxLength": 50 },
    "targetType": { "type": "string", "maxLength": 30 },
    "targetId": { "type": "string" },
    "pagePath": { "type": "string", "maxLength": 200 },
    "loggedIn": { "type": "boolean", "default": false },
    "success": { "type": "boolean", "default": true },
    "detail": { "type": "text" },
    "sessionId": { "type": "string", "maxLength": 64 },
    "visitorId": { "type": "string", "maxLength": 100 },
    "ipAddress": { "type": "string", "maxLength": 50 },
    "userAgent": { "type": "string", "maxLength": 500 },
    "userId": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user"
    }
  }
};

export default _default;
