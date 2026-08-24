declare const _default: {
  "kind": "collectionType",
  "collectionName": "activity_series",
  "info": { "singularName": "activity-series", "pluralName": "activity-series", "displayName": "Activity Series" },
  "options": { "draftAndPublish": false },
  "attributes": {
    "title": { "type": "string", "required": true },
    "description": { "type": "text" },
    "cover": { "type": "string" },
    "sortOrder": { "type": "integer", "default": 0 },
    "status": { "type": "enumeration", "enum": ["active", "hidden"], "default": "active" },
    "schedule": { "type": "json" },
    "activities": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-point.activity", "mappedBy": "belongsToSeries" },
    "defaultRules": { "type": "json" },
    "tag": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-tag.tag"
    }
  }
};

export default _default;
