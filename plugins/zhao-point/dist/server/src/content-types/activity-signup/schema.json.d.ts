declare const _default: {
  "kind": "collectionType",
  "collectionName": "activity_signups",
  "info": { "singularName": "activity-signup", "pluralName": "activity-signups", "displayName": "Activity Signup" },
  "options": { "draftAndPublish": false },
  "attributes": {
    "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user" },
    "activity": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-point.activity" },
    "status": { "type": "enumeration", "enum": ["active", "cancelled", "waiting"], "default": "active" },
    "pointsCharged": { "type": "integer", "default": 0 },
    "signupAt": { "type": "datetime" },
    "attendedAt": { "type": "datetime" }
  }
};

export default _default;
