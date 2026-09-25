declare const _default: {
  "kind": "collectionType",
  "collectionName": "activity_checkin_tickets",
  "info": {
    "singularName": "activity-checkin-ticket",
    "pluralName": "activity-checkin-tickets",
    "displayName": "Activity Checkin Ticket",
    "description": "到场核销票据（服务端签发，一签一码）"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": { "i18n": { "localized": false } },
  "attributes": {
    "token": { "type": "string", "unique": true, "private": true, "required": true },
    "signup": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-point.activity-signup", "required": true },
    "activity": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-point.activity", "required": true },
    "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user", "required": true },
    "status": { "type": "enumeration", "enum": ["pending", "used", "expired"], "default": "pending" },
    "expiresAt": { "type": "datetime", "required": true },
    "usedAt": { "type": "datetime" },
    "usedByUserId": { "type": "integer" }
  }
};

export default _default;
