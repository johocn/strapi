declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_site_templates",
  "info": {
    "singularName": "site-template",
    "pluralName": "site-templates",
    "displayName": "站点模板",
    "description": "租户配置模板，定义预设值和字段约束"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "maxLength": 100
    },
    "displayName": {
      "type": "string",
      "maxLength": 100
    },
    "description": {
      "type": "text"
    },
    "presetConfig": {
      "type": "json",
      "required": true
    },
    "fieldConstraints": {
      "type": "json",
      "required": true
    },
    "enabled": {
      "type": "boolean",
      "default": true
    },
    "isDefault": {
      "type": "boolean",
      "default": false
    },
    "sites": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-common.site-config",
      "mappedBy": "template"
    },
    "themeConfig": {
      "type": "json",
      "default": "{}"
    }
  }
}
;

export default _default;
