declare const _default: {
  "kind": "collectionType",
  "collectionName": "wealth_consultations",
  "info": {
    "singularName": "wealth-consultation",
    "pluralName": "wealth-consultations",
    "displayName": "预约咨询",
    "description": "客户预约理财咨询服务记录"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "userId": {
      "type": "string",
      "required": true
    },
    "name": {
      "type": "string",
      "required": false
    },
    "phone": {
      "type": "string",
      "required": false
    },
    "productId": {
      "type": "integer"
    },
    "portfolioPlanId": {
      "type": "integer"
    },
    "preferredTime": {
      "type": "datetime"
    },
    "preferredChannel": {
      "type": "enumeration",
      "enum": ["online", "branch", "phone"],
      "default": "branch"
    },
    "message": {
      "type": "text"
    },
    "submitType": {
      "type": "enumeration",
      "enum": ["phone", "wechat", "message"],
      "default": "phone"
    },
    "contactType": {
      "type": "enumeration",
      "enum": ["phone", "email", "wechat"]
    },
    "contactValue": {
      "type": "string"
    },
    "wechatType": {
      "type": "enumeration",
      "enum": ["personal", "enterprise"]
    },
    "reply": {
      "type": "text"
    },
    "repliedAt": {
      "type": "datetime"
    },
    "status": {
      "type": "enumeration",
      "enum": ["pending", "confirmed", "completed", "cancelled", "replied"],
      "default": "pending"
    },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
;

export default _default;
