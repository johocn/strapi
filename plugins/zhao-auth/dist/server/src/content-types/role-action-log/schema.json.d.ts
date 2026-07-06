declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_role_action_logs",
  "info": {
    "name": "role-action-log",
    "description": "角色操作日志",
    "singularName": "role-action-log",
    "pluralName": "role-action-logs",
    "displayName": "Role Action Log"
  },
  "options": {
    "draftAndPublish": false,
    "timestamps": false
  },
  "attributes": {
    "operatorId": {
      "type": "integer",
      "required": true,
      "description": "操作人ID"
    },
    "targetUserId": {
      "type": "integer",
      "required": true,
      "description": "目标用户ID"
    },
    "action": {
      "type": "string",
      "required": true,
      "enum": [
        "assign",
        "revoke"
      ],
      "description": "操作类型"
    },
    "role": {
      "type": "string",
      "required": true,
      "description": "角色名称"
    },
    "reason": {
      "type": "text",
      "description": "操作原因"
    },
    "timestamp": {
      "type": "datetime",
      "required": true,
      "description": "操作时间"
    }
  }
};

export default _default;
