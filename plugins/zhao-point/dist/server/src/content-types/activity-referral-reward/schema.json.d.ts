declare const _default: {
  "kind": "collectionType",
  "collectionName": "activity_referral_rewards",
  "info": {
    "singularName": "activity-referral-reward",
    "pluralName": "activity-referral-rewards",
    "displayName": "Activity Referral Reward"
  },
  "options": { "draftAndPublish": false, "comment": "分享裂变奖励发放记录（幂等）" },
  "attributes": {
    "inviter": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user" },
    "invitee": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user" },
    "activity": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-point.activity" },
    "points": { "type": "integer", "default": 0 },
    "sourceInviteCode": { "type": "string" },
    "issuedAt": { "type": "datetime" }
  }
};

export default _default;
