declare const _default: {
    permission: {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            attributes: {
                role: {
                    type: string;
                    required: boolean;
                    unique: boolean;
                    maxLength: number;
                };
                displayName: {
                    type: string;
                    required: boolean;
                    maxLength: number;
                };
                description: {
                    type: string;
                };
                permissions: {
                    type: string;
                    required: boolean;
                    default: any[];
                };
                isSystem: {
                    type: string;
                    required: boolean;
                    default: boolean;
                };
                level: {
                    type: string;
                    default: number;
                    min: number;
                    max: number;
                };
                seedVersion: {
                    type: string;
                    default: string;
                };
            };
        };
    };
    "role-action-log": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                name: string;
                description: string;
                singularName: string;
                pluralName: string;
                displayName: string;
            };
            options: {
                draftAndPublish: boolean;
                timestamps: boolean;
            };
            attributes: {
                operatorId: {
                    type: string;
                    required: boolean;
                    description: string;
                };
                targetUserId: {
                    type: string;
                    required: boolean;
                    description: string;
                };
                action: {
                    type: string;
                    required: boolean;
                    enum: string[];
                    description: string;
                };
                role: {
                    type: string;
                    required: boolean;
                    description: string;
                };
                reason: {
                    type: string;
                    description: string;
                };
                timestamp: {
                    type: string;
                    required: boolean;
                    description: string;
                };
            };
        };
    };
    "role-channel": {
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
                role: {
                    type: string;
                    required: boolean;
                };
                channel: {
                    type: string;
                    relation: string;
                    target: string;
                };
                assignedBy: {
                    type: string;
                };
            };
        };
    };
};
export default _default;
