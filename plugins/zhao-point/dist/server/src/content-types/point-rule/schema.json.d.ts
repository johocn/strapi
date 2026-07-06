declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_point_rules",
  "info": {
    "singularName": "point-rule",
    "pluralName": "point-rules",
    "displayName": "积分规则",
    "description": "积分获取/扣除规则配置"
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
    "action": {
      "type": "string",
      "required": true,
      "unique": true
    },
    "category": {
      "type": "enumeration",
      "enum": ["increase", "decrease"],
      "required": true
    },
    "points": {
      "type": "integer",
      "required": true
    },
    "description": {
      "type": "string",
      "maxLength": 200
    },
    "enabled": {
      "type": "boolean",
      "default": true
    },
    "limitPerDay": {
      "type": "integer",
      "default": 0
    },
    "limitPerUser": {
      "type": "integer",
      "default": 0
    },
    "limitPerDayPerUser": {
      "type": "integer",
      "default": 0
    },
    "isOneTime": {
      "type": "boolean",
      "default": false
    },
    "startTime": {
      "type": "time"
    },
    "endTime": {
      "type": "time"
    },
    "applicableChannels": {
      "type": "json"
    },
    "priority": {
      "type": "integer",
      "default": 0
    },
    "taskGroup": {
      "type": "enumeration",
      "enum": ["daily", "interact", "learn", "social", "onetime", "other", "redeem", "penalty"],
      "default": "other"
    },
    "extraConfig": {
      "type": "json"
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
;

export default _default;
