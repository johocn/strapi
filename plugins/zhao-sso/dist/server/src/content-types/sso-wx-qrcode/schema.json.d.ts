declare const _default: {
  "kind": "collectionType",
  "collectionName": "sso_wx_qrcodes",
  "info": {
    "singularName": "sso-wx-qrcode",
    "pluralName": "sso-wx-qrcodes",
    "displayName": "SSO WeChat QRCode"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "scene_key": { "type": "string", "required": true, "unique": true },
    "title": { "type": "string" },
    "kind": {
      "type": "enumeration",
      "required": true,
      "enum": ["temporary", "permanent"],
      "default": "temporary"
    },
    "expire_seconds": { "type": "integer", "default": 2592000 },
    "ticket": { "type": "text" },
    "wx_url": { "type": "text" },
    "qrcode_url": { "type": "text" },
    "remark": { "type": "text" }
  }
};

export default _default;
