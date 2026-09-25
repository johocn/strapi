declare const _default: {
  "kind": "collectionType",
  "collectionName": "activity_attendances",
  "info": { "singularName": "activity-attendance", "pluralName": "activity-attendances", "displayName": "Activity Attendance" },
  "options": { "draftAndPublish": false },
  "attributes": {
    "signup": { "type": "relation", "relation": "oneToOne", "target": "plugin::zhao-point.activity-signup" },
    "method": { "type": "enumeration", "enum": ["worker_scan", "self", "manual"], "default": "self" },
    "checkinAt": { "type": "datetime" },
    "lat": { "type": "float" },
    "lng": { "type": "float" },
    "geoPassed": { "type": "boolean", "default": true },
    "pointsGranted": { "type": "boolean", "default": false },
    "manualReason": { "type": "string" },
    "operatorId": { "type": "integer" }
  }
};

export default _default;
