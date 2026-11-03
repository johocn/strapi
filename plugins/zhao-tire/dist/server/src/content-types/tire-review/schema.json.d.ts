declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_tire_reviews",
  "info": {
    "singularName": "tire-review",
    "pluralName": "tire-reviews",
    "displayName": "用户评价"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "nickname": {
      "type": "string"
    },
    "content": {
      "type": "text"
    },
    "rating": {
      "type": "integer"
    },
    "showOnHome": {
      "type": "boolean",
      "default": false
    },
    "sort": {
      "type": "integer",
      "default": 0
    }
  }
}
;

export default _default;
