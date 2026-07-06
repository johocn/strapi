declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_browser_logs",
  "info": {
    "singularName": "browser-log",
    "pluralName": "browser-logs",
    "displayName": "浏览器日志",
    "description": "用户浏览器信息和行为日志"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": {
      "visible": true
    },
    "content-type-builder": {
      "visible": true
    }
  },
  "attributes": {
    "eventType": {
      "type": "enumeration",
      "enum": ["page-view", "ad-click", "scroll", "read-duration", "user-register"],
      "required": true
    },
    "article": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-studio.article-draft"
    },
    "adSlot": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-studio.ad-slot"
    },
    "user": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "admin::user"
    },
    "userId": { "type": "string" },
    "sessionId": { "type": "string", "required": true },
    "isRegistered": { "type": "boolean", "default": false },
    "registeredAt": { "type": "datetime" },
    "userAgent": { "type": "string" },
    "platform": { "type": "string" },
    "browser": { "type": "string" },
    "browserVersion": { "type": "string" },
    "os": { "type": "string" },
    "osVersion": { "type": "string" },
    "deviceType": {
      "type": "enumeration",
      "enum": ["desktop", "mobile", "tablet"],
      "default": "desktop"
    },
    "screenWidth": { "type": "integer" },
    "screenHeight": { "type": "integer" },
    "language": { "type": "string" },
    "ip": { "type": "string" },
    "country": { "type": "string" },
    "city": { "type": "string" },
    "referrer": { "type": "string" },
    "referrerDomain": { "type": "string" },
    "readDuration": { "type": "integer", "default": 0 },
    "scrollDepth": { "type": "integer", "default": 0 },
    "timestamp": { "type": "datetime", "required": true },
    "createdAt": { "type": "datetime" }
  }
};

export default _default;
