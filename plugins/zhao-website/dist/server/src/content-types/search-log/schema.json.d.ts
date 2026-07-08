declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_website_search_logs",
  "info": {
    "singularName": "search-log",
    "pluralName": "search-logs",
    "displayName": "搜索日志"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": false },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true,
      "inversedBy": "website_search_logs"
    },
    "keyword": {
      "type": "string",
      "maxLength": 200,
      "required": true
    },
    "resultCount": {
      "type": "integer",
      "default": 0
    },
    "visitorId": {
      "type": "string",
      "maxLength": 100
    },
    "ipAddress": {
      "type": "string",
      "maxLength": 50
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
;

export default _default;
