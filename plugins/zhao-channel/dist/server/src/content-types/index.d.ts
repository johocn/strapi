declare const _default: {
    channel: {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
                description: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            attributes: {
                name: {
                    type: string;
                    required: boolean;
                    maxLength: number;
                };
                code: {
                    type: string;
                    required: boolean;
                    unique: boolean;
                    maxLength: number;
                };
                channelTier: {
                    type: string;
                    enum: string[];
                    default: string;
                    required: boolean;
                };
                parentChannel: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                childChannels: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                sites: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                members: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                status: {
                    type: string;
                    default: boolean;
                };
                description: {
                    type: string;
                };
                path: {
                    type: string;
                };
                depth: {
                    type: string;
                    default: number;
                    min: number;
                    max: number;
                };
                extraConfig: {
                    type: string;
                    default: string;
                };
            };
        };
    };
    "channel-member": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
                description: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            attributes: {
                channel: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                    required: boolean;
                };
                user: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                };
                role: {
                    type: string;
                    enum: string[];
                    default: string;
                    required: boolean;
                };
                invitedBy: {
                    type: string;
                    relation: string;
                    target: string;
                };
                isCurrent: {
                    type: string;
                    default: boolean;
                };
            };
        };
    };
    "user-channel": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
                description: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            attributes: {
                user: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                };
                channel: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                };
                grantedBy: {
                    type: string;
                    relation: string;
                    target: string;
                };
                grantedAt: {
                    type: string;
                };
            };
        };
    };
    "user-invite": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
                description: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            attributes: {
                user: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                    unique: boolean;
                };
                inviteCode: {
                    type: string;
                    unique: boolean;
                    required: boolean;
                    maxLength: number;
                };
                invitedBy: {
                    type: string;
                    relation: string;
                    target: string;
                };
                inviteChannel: {
                    type: string;
                    relation: string;
                    target: string;
                };
                inviteMethod: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                distributionPath: {
                    type: string;
                };
                distributionDepth: {
                    type: string;
                    default: number;
                    min: number;
                    max: number;
                };
                used: {
                    type: string;
                    default: boolean;
                };
                expiresAt: {
                    type: string;
                };
            };
        };
    };
};
export default _default;
