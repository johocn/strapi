declare const _default: {
  "kind": "collectionType",
  "collectionName": "wealth_disclosures",
  "info": {
    "singularName": "wealth-disclosure",
    "pluralName": "wealth-disclosures",
    "displayName": "合规披露",
    "description": "按产品类型的合规披露文案"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "productType": {
      "type": "enumeration",
      "enum": ["bank-wealth", "stock-fund", "bond-fund", "mixed-fund", "money-fund", "all"],
      "required": true
    },
    "title": { "type": "string", "required": true },
    "content": { "type": "text", "required": true },
    "effectiveDate": { "type": "date", "required": true },
    "status": { "type": "boolean", "default": true },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
;

export default _default;
