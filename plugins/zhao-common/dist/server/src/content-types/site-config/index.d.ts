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
                    website: boolean;
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
            tags: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
            tagGroups: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
            website_seo_config: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
            website_brand_info: {
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
            website_article_categories: {
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
            website_tutorials: {
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
            website_ai_summaries: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
            website_first_truths: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
            website_knowledge_entities: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
            website_knowledge_relations: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
            website_leads: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
            website_interactions: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
            website_search_logs: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
            website_visit_logs: {
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
        };
    };
};
export default _default;
