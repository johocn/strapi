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
            code: {
                type: string;
                unique: boolean;
                required: boolean;
            };
            creator: {
                type: string;
                relation: string;
                target: string;
            };
            invite_type: {
                type: string;
                enum: string[];
                required: boolean;
            };
            max_uses: {
                type: string;
            };
            use_count: {
                type: string;
                default: number;
                required: boolean;
            };
            per_user_limit: {
                type: string;
                default: number;
                required: boolean;
            };
            valid_from: {
                type: string;
            };
            valid_until: {
                type: string;
            };
            bonus_tags: {
                type: string;
            };
            is_active: {
                type: string;
                default: boolean;
                required: boolean;
            };
        };
    };
};
export default _default;
