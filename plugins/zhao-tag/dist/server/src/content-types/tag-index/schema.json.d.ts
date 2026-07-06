declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_tag_indexes",
  "info": {
    "singularName": "tag-index",
    "pluralName": "tag-indexes",
    "displayName": "标签索引"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "targetType": {
      "type": "string",
      "required": true
    },
    "targetId": {
      "type": "string",
      "required": true
    },
    "tag": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-tag.tag",
      "inversedBy": "indexes"
    },
    "createdAt": {
      "type": "datetime"
    }
  }
}
;

export default _default;
