declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_logistics_referrals",
  "info": {
    "singularName": "referral",
    "pluralName": "referrals",
    "displayName": "推荐奖励"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true,
      "inversedBy": "logistics_referrals"
    },
    "referralCode": {
      "type": "string",
      "maxLength": 50,
      "required": true
    },
    "referrerName": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "referrerContact": {
      "type": "string",
      "maxLength": 200,
      "required": true
    },
    "referrerCustomerId": {
      "type": "string"
    },
    "refereeName": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "refereeContact": {
      "type": "string",
      "maxLength": 200,
      "required": true
    },
    "refereeCustomerId": {
      "type": "string"
    },
    "referralChannel": {
      "type": "enumeration",
      "enum": ["friend", "community", "exhibition", "partner", "other"],
      "required": true
    },
    "referralSource": {
      "type": "string",
      "maxLength": 100
    },
    "status": {
      "type": "enumeration",
      "enum": ["pending", "contacted", "qualified", "converted", "rewarded", "invalid"],
      "default": "pending",
      "required": true
    },
    "quoteRequestId": {
      "type": "string"
    },
    "intentOrderId": {
      "type": "string"
    },
    "rewardType": {
      "type": "enumeration",
      "enum": ["points", "cash", "discount", "gift"],
      "required": true
    },
    "rewardAmount": {
      "type": "decimal"
    },
    "rewardStatus": {
      "type": "enumeration",
      "enum": ["pending", "issued", "claimed"],
      "default": "pending"
    },
    "rewardIssuedAt": {
      "type": "datetime"
    },
    "conversionValue": {
      "type": "decimal"
    },
    "convertedAt": {
      "type": "datetime"
    },
    "remark": {
      "type": "text"
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
;

export default _default;
