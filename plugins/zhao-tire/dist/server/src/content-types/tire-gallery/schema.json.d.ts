declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_tire_galleries",
  "info": {
    "singularName": "tire-gallery",
    "pluralName": "tire-galleries",
    "displayName": "实拍相册"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "image": {
      "type": "media",
      "multiple": false,
      "allowedTypes": ["images"]
    },
    "caption": {
      "type": "string"
    },
    "sort": {
      "type": "integer",
      "default": 0
    }
  }
}
;

export default _default;
