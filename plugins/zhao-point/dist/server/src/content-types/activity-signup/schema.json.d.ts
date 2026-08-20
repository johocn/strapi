declare const _default: {
  "kind": "collectionType",
  "collectionName": "activity_signups",
  "info": { "singularName": "activity-signup", "pluralName": "activity-signups", "displayName": "Activity Signup" },
  "options": { "draftAndPublish": false },
  "attributes": {
    "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user", "inversedBy": "activity_signups" },
    "activity": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-point.activity", "inversedBy": "signups" },
    "status": { "type": "enumeration", "enum": ["active", "cancelled"], "default": "active" },
    "signupAt": { "type": "datetime" },
    "attendedAt": { "type": "datetime" }
  }
};

export default _default;
