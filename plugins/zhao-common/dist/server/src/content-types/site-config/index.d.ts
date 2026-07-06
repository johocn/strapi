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
            siteName: {
                type: string;
                maxLength: number;
            };
            siteDescription: {
                type: string;
            };
            logo: {
                type: string;
                multiple: boolean;
                required: boolean;
                allowedTypes: string[];
            };
            favicon: {
                type: string;
                multiple: boolean;
                required: boolean;
                allowedTypes: string[];
            };
            icpNumber: {
                type: string;
                maxLength: number;
            };
            seoKeywords: {
                type: string;
                maxLength: number;
            };
            seoDescription: {
                type: string;
            };
            tencentMapKey: {
                type: string;
                maxLength: number;
            };
            shareTitle: {
                type: string;
                maxLength: number;
            };
            shareDescription: {
                type: string;
                maxLength: number;
            };
            shareImage: {
                type: string;
                multiple: boolean;
                required: boolean;
                allowedTypes: string[];
            };
            customerServiceUrl: {
                type: string;
                maxLength: number;
            };
            domain: {
                type: string;
                maxLength: number;
                unique: boolean;
            };
            channels: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
            featureFlags: {
                type: string;
                default: {
                    sso: boolean;
                    points: boolean;
                    quiz: boolean;
                    course: boolean;
                    channel: boolean;
                    thirdParty: boolean;
                    oss: boolean;
                };
            };
            template: {
                type: string;
                relation: string;
                target: string;
                inversedBy: string;
            };
            extraConfig: {
                type: string;
            };
            themeConfig: {
                type: string;
                default: string;
            };
            channelUsage: {
                type: string;
                enum: string[];
                default: string;
                required: boolean;
            };
        };
    };
};
export default _default;
