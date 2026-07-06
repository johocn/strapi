declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_tags",
  "info": {
    "singularName": "tag",
    "pluralName": "tags",
    "displayName": "标签"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "name": {
      "type": "string",
      "required": true
    },
    "slug": {
      "type": "uid",
      "targetField": "name",
      "required": false
    },
    "description": {
      "type": "text"
    },
    "color": {
      "type": "string"
    },
    "icon": {
      "type": "media",
      "multiple": false
    },
    "tagGroup": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-tag.tag-group",
      "inversedBy": "tags"
    },
    "parent": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-tag.tag",
      "inversedBy": "children"
    },
    "children": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-tag.tag",
      "mappedBy": "parent"
    },
    "sort": {
      "type": "integer",
      "default": 0
    },
    "isPreset": {
      "type": "boolean",
      "default": false
    },
    "isPublic": {
      "type": "boolean",
      "default": true
    },
    "indexes": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-tag.tag-index",
      "mappedBy": "tag"
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
};

export default _default;
