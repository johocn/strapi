declare const _default: {
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
            moduleEnabled: {
                type: string;
                default: {
                    website: boolean;
                    logistics: boolean;
                    studio: boolean;
                    points: boolean;
                    course: boolean;
                    quiz: boolean;
                    channel: boolean;
                    sso: boolean;
                    thirdParty: boolean;
                    oss: boolean;
                    payment: boolean;
                    community: boolean;
                    forum: boolean;
                };
            };
            moduleTenantGrants: {
                type: string;
                default: {};
            };
            moduleVisibility: {
                type: string;
                default: {};
            };
        };
    };
};
export default _default;
