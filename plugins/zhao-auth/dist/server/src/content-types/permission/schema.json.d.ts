declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_permissions",
  "info": {
    "singularName": "permission",
    "pluralName": "permissions",
    "displayName": "角色权限"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "role": {
      "type": "string",
      "required": true,
      "unique": true,
      "maxLength": 50
    },
    "displayName": {
      "type": "string",
      "required": true,
      "maxLength": 50
    },
    "description": {
      "type": "text"
    },
    "permissions": {
      "type": "json",
      "required": true,
      "default": []
    },
    "isSystem": {
      "type": "boolean",
      "required": true,
      "default": false
    },
    "level": {
      "type": "integer",
      "default": 20,
      "min": 1,
      "max": 100
    }
  }
}
;

export default _default;
