declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_tire_referral_rewards",
  "info": {
    "singularName": "tire-referral-reward",
    "pluralName": "tire-referral-rewards",
    "displayName": "邀请奖励券"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "rewardNo": {
      "type": "string",
      "required": true,
      "unique": true,
      "maxLength": 40
    },
    "phone": {
      "type": "string",
      "required": true
    },
    "amount": {
      "type": "integer",
      "default": 0
    },
    "source": {
      "type": "enumeration",
      "enum": ["referral_3", "manual", "debt"],
      "default": "referral_3"
    },
    "status": {
      "type": "enumeration",
      "enum": ["available", "reserved", "used", "expired", "void"],
      "default": "available"
    },
    "issuedAt": {
      "type": "datetime"
    },
    "expiresAt": {
      "type": "datetime"
    },
    "usedOrderNo": {
      "type": "string",
      "maxLength": 40
    },
    "usedAt": {
      "type": "datetime"
    },
    "note": {
      "type": "string",
      "maxLength": 255
    }
  }
}
;

export default _default;
