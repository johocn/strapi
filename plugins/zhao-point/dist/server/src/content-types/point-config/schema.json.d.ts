declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_point_configs",
  "info": {
    "singularName": "point-config",
    "pluralName": "point-configs",
    "displayName": "积分配置",
    "description": "积分模块全局配置"
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
    "moduleEnabled": {
      "type": "boolean",
      "default": true
    },
    "earnEnabled": {
      "type": "boolean",
      "default": true
    },
    "redeemEnabled": {
      "type": "boolean",
      "default": true
    },
    "expiryEnabled": {
      "type": "boolean",
      "default": false
    },
    "expiryDays": {
      "type": "integer",
      "default": 365
    },
    "expiryReminderDays": {
      "type": "integer",
      "default": 7
    },
    "minRedeemPoints": {
      "type": "integer",
      "default": 0
    },
    "maxDailyEarn": {
      "type": "integer",
      "default": 0
    },
    "defaultExchangeRate": {
      "type": "decimal",
      "precision": 10,
      "scale": 2,
      "default": 1.00
    },
    "remark": {
      "type": "text"
    },
    "signInEnabled": {
      "type": "boolean",
      "default": true
    },
    "tasksEnabled": {
      "type": "boolean",
      "default": true
    },
    "quizRetryEnabled": {
      "type": "boolean",
      "default": true
    },
    "quizMaxRetryCount": {
      "type": "integer",
      "default": 1
    },
    "maxDailyQuiz": {
      "type": "integer",
      "default": 3
    },
    "tencentMapKey": {
      "type": "string"
    }
  }
}
;

export default _default;
