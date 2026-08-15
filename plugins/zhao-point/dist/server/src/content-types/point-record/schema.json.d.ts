declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_point_records",
  "info": {
    "singularName": "point-record",
    "pluralName": "point-records",
    "displayName": "积分记录",
    "description": "用户积分变动记录"
  },
  "options": {
    "draftAndPublish": false,
    "comment": ""
  },
  "pluginOptions": {
    "content-manager": {
      "visible": true
    },
    "content-type-builder": {
      "visible": false
    }
  },
  "attributes": {
    "user": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user",
      "required": true
    },
    "action": {
      "type": "string",
      "required": true
    },
    "type": {
      "type": "enumeration",
      "enum": ["increase", "decrease"],
      "required": true
    },
    "points": {
      "type": "integer",
      "required": true
    },
    "balance": {
      "type": "integer",
      "required": true
    },
    "source": {
      "type": "string",
      "maxLength": 64
    },
    "method": {
      "type": "string",
      "maxLength": 100
    },
    "orderId": {
      "type": "string",
      "maxLength": 64
    },
    "remark": {
      "type": "text"
    },
    "operator": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "admin::user"
    },
    "expiresAt": {
      "type": "datetime"
    },
    "expiredAt": {
      "type": "datetime"
    },
    "channel": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-channel.channel"
    },
    "userChannel": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-channel.channel"
    }
  }
}
;

export default _default;
