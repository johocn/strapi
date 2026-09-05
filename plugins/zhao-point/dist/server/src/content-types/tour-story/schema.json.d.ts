declare const _default: {
  "kind": "collectionType",
  "collectionName": "tour_stories",
  "info": { "singularName": "tour-story", "pluralName": "tour-stories", "displayName": "Tour Story", "description": "在地剧本游·剧目（线路剧本）" },
  "options": { "draftAndPublish": false },
  "pluginOptions": { "i18n": { "localized": false } },
  "attributes": {
    "title": { "type": "string", "required": true },
    "lineTitle": { "type": "string" },
    "backdrop": { "type": "text", "description": "剧目背景/剧情引子" },
    "roles": { "type": "json", "description": "[{id,name,desc}] 可选角色" },
    "mainPuzzle": { "type": "text", "description": "主线谜题说明" },
    "answer": { "type": "string", "description": "谜底（MVP 明文；如需安全可改存哈希+比哈希）" },
    "hint": { "type": "text" },
    "stationPoints": { "type": "integer", "default": 10 },
    "mainPoints": { "type": "integer", "default": 50 },
    "finalePoints": { "type": "integer", "default": 100 },
    "guideName": { "type": "string" },
    "activities": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-point.activity", "mappedBy": "story" }
  }
};

export default _default;
