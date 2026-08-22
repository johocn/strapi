declare const _default: {
  "kind": "collectionType",
  "collectionName": "sso_wx_menus",
  "info": {
    "singularName": "sso-wx-menu",
    "pluralName": "sso-wx-menus",
    "displayName": "SSO WeChat Menu"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "name": { "type": "string", "required": true },
    "menu_json": { "type": "json", "required": true },
    "enabled": { "type": "boolean", "default": true },
    "publish_state": {
      "type": "enumeration",
      "enum": ["local", "published", "failed"],
      "default": "local"
    },
    "last_publish_at": { "type": "datetime" },
    "last_error": { "type": "text" }
  }
};

export default _default;
