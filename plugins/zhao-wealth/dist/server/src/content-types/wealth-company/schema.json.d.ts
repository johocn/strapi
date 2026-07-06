declare const _default: {
  "kind": "collectionType",
  "collectionName": "wealth_companies",
  "info": {
    "singularName": "wealth-company",
    "pluralName": "wealth-companies",
    "displayName": "理财公司",
    "description": "银行理财公司信息管理"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "name": { "type": "string", "required": true },
    "shortName": { "type": "string" },
    "companyType": { "type": "enumeration", "enum": ["bank", "bank-subsidiary", "joint-venture"], "default": "bank-subsidiary" },
    "website": { "type": "string" },
    "products": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-wealth.wealth-product", "mappedBy": "company" },
    "status": { "type": "boolean", "default": true },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
;

export default _default;
