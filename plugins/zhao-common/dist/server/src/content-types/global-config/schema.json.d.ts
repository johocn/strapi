declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_global_configs",
  "info": {
    "singularName": "global-config",
    "pluralName": "global-configs",
    "displayName": "全局配置",
    "description": "跨租户的全局模块开关，优先级最高，仅 admin 可改"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "moduleEnabled": {
      "type": "json",
      "default": {
        "website": false,
        "logistics": false,
        "studio": false,
        "points": true,
        "course": true,
        "quiz": true,
        "channel": true,
        "sso": false,
        "thirdParty": false,
        "oss": false,
        "payment": false,
        "community": false,
        "forum": false
      }
    },
    "moduleTenantGrants": {
      "type": "json",
      "default": {}
    },
    "moduleVisibility": {
      "type": "json",
      "default": {}
    }
  }
}
;

export default _default;
