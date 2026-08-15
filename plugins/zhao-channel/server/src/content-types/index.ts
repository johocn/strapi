import { getAllTiers, MAX_CHANNEL_DEPTH } from "../config/tiers";

export default {
  channel: {
    schema: {
      kind: "collectionType",
      collectionName: "zhao_channels",
      info: {
        singularName: "channel",
        pluralName: "channels",
        displayName: "Channel",
        description: "渠道"
      },
      options: {
        draftAndPublish: false
      },
      attributes: {
        name: {
          type: "string",
          required: true,
          maxLength: 100
        },
        code: {
          type: "string",
          required: true,
          unique: true,
          maxLength: 32
        },
        channelTier: {
          type: "enumeration",
          enum: getAllTiers(),
          default: "store",
          required: true
        },
        parentChannel: {
          type: "relation",
          relation: "manyToOne",
          target: "plugin::zhao-channel.channel",
          inversedBy: "childChannels"
        },
        childChannels: {
          type: "relation",
          relation: "oneToMany",
          target: "plugin::zhao-channel.channel",
          mappedBy: "parentChannel"
        },
        sites: {
          type: "relation",
          relation: "manyToMany",
          target: "plugin::zhao-common.site-config",
          inversedBy: "channels"
        },
        members: {
          type: "relation",
          relation: "oneToMany",
          target: "plugin::zhao-channel.channel-member",
          mappedBy: "channel"
        },
        status: {
          type: "boolean",
          default: true
        },
        description: {
          type: "text"
        },
        path: {
          type: "text"
        },
        depth: {
          type: "integer",
          default: 0,
          min: 0,
          max: MAX_CHANNEL_DEPTH
        },
        extraConfig: {
          type: "json",
          default: "{}"
        }
      }
    }
  },
  "channel-member": {
    schema: {
      kind: "collectionType",
      collectionName: "zhao_channel_members",
      info: {
        singularName: "channel-member",
        pluralName: "channel-members",
        displayName: "Channel Member",
        description: "渠道成员关联"
      },
      options: {
        draftAndPublish: false
      },
      attributes: {
        channel: {
          type: "relation",
          relation: "manyToOne",
          target: "plugin::zhao-channel.channel",
          inversedBy: "members",
          required: true
        },
        user: {
          type: "relation",
          relation: "manyToOne",
          target: "plugin::users-permissions.user",
          required: true
        },
        role: {
          type: "enumeration",
          enum: ["owner", "admin", "member"],
          default: "member",
          required: true
        },
        invitedBy: {
          type: "relation",
          relation: "manyToOne",
          target: "plugin::users-permissions.user"
        },
        "isCurrent": {
          "type": "boolean",
          "default": false
        }
      }
    }
  },
  "user-channel": {
    schema: {
      kind: "collectionType",
      collectionName: "zhao_user_channels",
      info: {
        singularName: "user-channel",
        pluralName: "user-channels",
        displayName: "User Channel",
        description: "用户-渠道关联"
      },
      options: {
        draftAndPublish: false
      },
      attributes: {
        user: {
          type: "relation",
          relation: "manyToOne",
          target: "plugin::users-permissions.user",
          required: true
        },
        channel: {
          type: "relation",
          relation: "manyToOne",
          target: "plugin::zhao-channel.channel",
          required: true
        },
        grantedBy: {
          type: "relation",
          relation: "manyToOne",
          target: "plugin::users-permissions.user"
        },
        grantedAt: {
          type: "datetime"
        }
      }
    }
  },
  "user-invite": {
    schema: {
      kind: "collectionType",
      collectionName: "zhao_user_invites",
      info: {
        singularName: "user-invite",
        pluralName: "user-invites",
        displayName: "User Invite",
        description: "用户邀请码与分销链信息"
      },
      options: {
        draftAndPublish: false
      },
      attributes: {
        user: {
          type: "relation",
          relation: "oneToOne",
          target: "plugin::users-permissions.user",
          required: true,
          unique: true
        },
        inviteCode: {
          type: "string",
          unique: true,
          required: true,
          maxLength: 16
        },
        invitedBy: {
          type: "relation",
          relation: "manyToOne",
          target: "plugin::users-permissions.user"
        },
        inviteChannel: {
          type: "relation",
          relation: "manyToOne",
          target: "plugin::zhao-channel.channel"
        },
        inviteMethod: {
          type: "enumeration",
          enum: ["invite_code", "organic"],
          default: "organic"
        },
        distributionPath: {
          type: "text"
        },
        distributionDepth: {
          type: "integer",
          default: 0,
          min: 0,
          max: 2
        },
        used: {
          type: "boolean",
          default: false
        },
        expiresAt: {
          type: "datetime"
        }
      }
    }
  }
};