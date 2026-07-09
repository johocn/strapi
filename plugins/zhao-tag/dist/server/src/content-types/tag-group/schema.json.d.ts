declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_tag_groups",
  "info": {
    "singularName": "tag-group",
    "pluralName": "tag-groups",
    "displayName": "标签分组"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "i18n": { "localized": true }
  },
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "localized": true
    },
    "slug": {
      "type": "uid",
      "targetField": "name",
      "required": false,
      "localized": true
    },
    "description": {
      "type": "text",
      "localized": true
    },
    "color": {
      "type": "string"
    },
    "icon": {
      "type": "media",
      "multiple": false
    },
    "sort": {
      "type": "integer",
      "default": 0
    },
    "isPublic": {
      "type": "boolean",
      "default": true
    },
    "site": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "inversedBy": "tagGroups"
    },
    "parent": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-tag.tag-group",
      "inversedBy": "children"
    },
    "children": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-tag.tag-group",
      "mappedBy": "parent"
    },
    "tags": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-tag.tag",
      "mappedBy": "tagGroup"
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
;

export default _default;
