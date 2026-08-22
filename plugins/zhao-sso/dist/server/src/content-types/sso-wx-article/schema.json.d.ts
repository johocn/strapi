declare const _default: {
  "kind": "collectionType",
  "collectionName": "sso_wx_articles",
  "info": {
    "singularName": "sso-wx-article",
    "pluralName": "sso-wx-articles",
    "displayName": "SSO WeChat Article"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "draft_id": { "type": "string" },
    "title": { "type": "string", "required": true },
    "author": { "type": "string" },
    "digest": { "type": "string" },
    "content": { "type": "text" },
    "thumb_media_id": { "type": "string" },
    "pic_url": { "type": "string" },
    "content_source_url": { "type": "string" },
    "show_cover_pic": { "type": "boolean", "default": true },
    "publish_state": {
      "type": "enumeration",
      "enum": ["draft", "publishing", "published", "failed"],
      "default": "draft"
    },
    "publish_id": { "type": "string" },
    "wx_published_at": { "type": "datetime" },
    "last_error": { "type": "text" }
  }
};

export default _default;
