declare const _default: {
    tag: {
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
                name: {
                    type: string;
                    required: boolean;
                };
                slug: {
                    type: string;
                    targetField: string;
                    required: boolean;
                };
                description: {
                    type: string;
                };
                color: {
                    type: string;
                };
                icon: {
                    type: string;
                    multiple: boolean;
                };
                tagGroup: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                parent: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                children: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                sort: {
                    type: string;
                    default: number;
                };
                isPreset: {
                    type: string;
                    default: boolean;
                };
                isPublic: {
                    type: string;
                    default: boolean;
                };
                indexes: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                deletedAt: {
                    type: string;
                    default: null;
                };
            };
        };
    };
    "knowledge-point": {
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
                name: {
                    type: string;
                    required: boolean;
                };
                slug: {
                    type: string;
                    targetField: string;
                    required: boolean;
                };
                description: {
                    type: string;
                };
                code: {
                    type: string;
                };
                level: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                parent: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                children: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                sort: {
                    type: string;
                    default: number;
                };
                deletedAt: {
                    type: string;
                    default: null;
                };
            };
        };
    };
    "tag-index": {
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
                targetType: {
                    type: string;
                    required: boolean;
                };
                targetId: {
                    type: string;
                    required: boolean;
                };
                tag: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                createdAt: {
                    type: string;
                };
            };
        };
    };
    "tag-group": {
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
                name: {
                    type: string;
                    required: boolean;
                };
                slug: {
                    type: string;
                    targetField: string;
                    required: boolean;
                };
                description: {
                    type: string;
                };
                color: {
                    type: string;
                };
                icon: {
                    type: string;
                    multiple: boolean;
                };
                sort: {
                    type: string;
                    default: number;
                };
                parent: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                children: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                tags: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                deletedAt: {
                    type: string;
                    default: null;
                };
            };
        };
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map