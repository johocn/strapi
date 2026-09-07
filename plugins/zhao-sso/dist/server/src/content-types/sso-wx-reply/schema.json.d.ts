declare const _default: {
  "kind": "collectionType",
  "collectionName": "sso_wx_replies",
  "info": {
    "singularName": "sso-wx-reply",
    "pluralName": "sso-wx-replies",
    "displayName": "SSO WeChat Reply"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "trigger": {
      "type": "enumeration",
      "enum": ["welcome", "fallback", "keyword"],
      "default": "keyword",
      "required": true
    },
    "match": { "type": "string", "unique": true },
    "reply_type": {
      "type": "enumeration",
      "enum": ["text", "image", "voice", "video", "music", "news", "transfer", "article"],
      "default": "text"
    },
    "text": { "type": "text" },
    "title": { "type": "string" },
    "desc": { "type": "string" },
    "pic_url": { "type": "string" },
    "link_url": { "type": "string" },
    "media_id": { "type": "string" },
    "music_url": { "type": "string" },
    "hq_music_url": { "type": "string" },
    "thumb_media_id": { "type": "string" },
    "articles": { "type": "json" },
    "sort": { "type": "integer", "default": 0 },
    "enabled": { "type": "boolean", "default": true }
  }
};

export default _default;
