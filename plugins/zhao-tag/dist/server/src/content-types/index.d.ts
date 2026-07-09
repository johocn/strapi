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
            pluginOptions: {
                i18n: {
                    localized: boolean;
                };
            };
            attributes: {
                name: {
                    type: string;
                    required: boolean;
                    localized: boolean;
                };
                slug: {
                    type: string;
                    targetField: string;
                    required: boolean;
                    localized: boolean;
                };
                description: {
                    type: string;
                    localized: boolean;
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
                site: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                indexes: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                website_articles: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                website_tutorials: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                website_cases: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                website_faqs: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                website_compliances: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                website_downloads: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                website_products: {
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
            pluginOptions: {
                i18n: {
                    localized: boolean;
                };
            };
            attributes: {
                name: {
                    type: string;
                    required: boolean;
                    localized: boolean;
                };
                slug: {
                    type: string;
                    targetField: string;
                    required: boolean;
                    localized: boolean;
                };
                description: {
                    type: string;
                    localized: boolean;
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
                isPublic: {
                    type: string;
                    default: boolean;
                };
                site: {
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