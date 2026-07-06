declare const _default: {
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
            user: {
                type: string;
                relation: string;
                target: string;
            };
            app_code: {
                type: string;
                required: boolean;
            };
            role: {
                type: string;
                required: boolean;
            };
        };
    };
};
export default _default;
