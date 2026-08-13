declare const _default: {
  "kind": "collectionType",
  "collectionName": "wealth_portfolio_plans",
  "info": {
    "singularName": "wealth-portfolio-plan",
    "pluralName": "wealth-portfolio-plans",
    "displayName": "组合方案",
    "description": "用户创建的产品组合方案（关注产品+配比+假设金额）"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "userId": {
      "type": "string",
      "required": true
    },
    "planName": {
      "type": "string",
      "required": true
    },
    "planType": {
      "type": "enumeration",
      "enum": ["conservative", "balanced", "aggressive", "custom"],
      "default": "custom"
    },
    "products": {
      "type": "json",
      "required": true
    },
    "totalAmount": {
      "type": "decimal",
      "precision": 14,
      "scale": 2
    },
    "status": {
      "type": "enumeration",
      "enum": ["active", "archived"],
      "default": "active"
    },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
;

export default _default;
