declare const _default: {
  "kind": "collectionType",
  "collectionName": "product_survey_demands",
  "info": { "singularName": "product-survey-demand", "pluralName": "product-survey-demands", "displayName": "Product Survey Demand" },
  "options": { "draftAndPublish": false },
  "attributes": {
    "channel": { "type": "string", "required": true, "description": "渠道隔离字段：Strapi channel 自增 id 的字符串形式，由服务端按请求站点解析写入，勿手工修改" },
    "roundKey": { "type": "string", "required": true, "description": "选品周期键，格式 YYYY-Www（如 2026-W40）" },
    "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user" },
    "userId": { "type": "integer", "private": true, "description": "用户 id 冗余镜像（关系落 lnk 表，DB 无法跨表建唯一约束），由提交链路写入，勿手工修改" },
    "text": { "type": "text", "required": true },
    "source": { "type": "string", "description": "归因活动 documentId" }
  }
};

export default _default;
