declare const _default: {
  "kind": "collectionType",
  "collectionName": "venues",
  "info": { "singularName": "venue", "pluralName": "venues", "displayName": "Venue", "description": "场地资源主档" },
  "options": { "draftAndPublish": false },
  "pluginOptions": { "i18n": { "localized": false } },
  "attributes": {
    "name": { "type": "string", "required": true },
    "desc": { "type": "text" },
    "defaultBufferMin": { "type": "integer", "default": 15 },
    "lat": { "type": "float" },
    "lng": { "type": "float" },
    "disabled": { "type": "boolean", "default": false },
    "activities": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-point.activity", "mappedBy": "venue" },
    "cashMode": { "type": "enumeration", "enum": ["none", "flat"], "default": "none" },
    "cashFee": { "type": "decimal", "default": 0 }
  }
};

export default _default;
