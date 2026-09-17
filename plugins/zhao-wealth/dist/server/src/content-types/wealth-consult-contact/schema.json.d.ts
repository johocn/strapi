declare const _default: {
  "kind": "collectionType",
  "collectionName": "wealth_consult_contacts",
  "info": {
    "singularName": "wealth-consult-contact",
    "pluralName": "wealth-consult-contacts",
    "displayName": "服务人联系方式"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {},
  "attributes": {
    "inviterId": { "type": "integer", "unique": true },
    "nickname": { "type": "string" },
    "branchName": { "type": "string" },
    "branchPhones": { "type": "json" },
    "latitude": { "type": "decimal" },
    "longitude": { "type": "decimal" },
    "city": { "type": "string" },
    "enterpriseWechatQr": { "type": "media", "allowedTypes": ["images"], "multiple": false },
    "enterpriseWechatId": { "type": "string" },
    "personalWechatQr": { "type": "media", "allowedTypes": ["images"], "multiple": false },
    "personalWechatId": { "type": "string" }
  }
}
;

export default _default;
