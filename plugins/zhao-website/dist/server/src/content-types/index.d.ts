declare const _default: {
    "seo-config": {
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
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                site: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                    inversedBy: string;
                };
                defaultTitle: {
                    type: string;
                    maxLength: number;
                };
                titleTemplate: {
                    type: string;
                    maxLength: number;
                };
                defaultDescription: {
                    type: string;
                    maxLength: number;
                };
                defaultKeywords: {
                    type: string;
                    maxLength: number;
                };
                ogImage: {
                    type: string;
                };
                favicon: {
                    type: string;
                };
                googleSiteVerification: {
                    type: string;
                    maxLength: number;
                };
                baiduSiteVerification: {
                    type: string;
                    maxLength: number;
                };
                bingSiteVerification: {
                    type: string;
                    maxLength: number;
                };
                baiduAnalyticsId: {
                    type: string;
                    maxLength: number;
                };
                googleAnalyticsId: {
                    type: string;
                    maxLength: number;
                };
                customHeadCode: {
                    type: string;
                };
                customBodyCode: {
                    type: string;
                };
                enableSitemap: {
                    type: string;
                    default: boolean;
                };
                sitemapExcludeTypes: {
                    type: string;
                };
                enableRobotsTxt: {
                    type: string;
                    default: boolean;
                };
                robotsContent: {
                    type: string;
                };
                aiCrawlerPolicy: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                geoRegion: {
                    type: string;
                    maxLength: number;
                };
                geoPlacename: {
                    type: string;
                    maxLength: number;
                };
                geoPosition: {
                    type: string;
                    maxLength: number;
                };
                geoICBM: {
                    type: string;
                    maxLength: number;
                };
                defaultLocale: {
                    type: string;
                    maxLength: number;
                    default: string;
                };
                alternateLocales: {
                    type: string;
                };
                hreflangStrategy: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                organizationName: {
                    type: string;
                    maxLength: number;
                };
                organizationLogo: {
                    type: string;
                };
                organizationType: {
                    type: string;
                    maxLength: number;
                };
                schemaSameAs: {
                    type: string;
                };
                schemaContactPoint: {
                    type: string;
                };
                icpNumber: {
                    type: string;
                    maxLength: number;
                };
                publicSecurityRecord: {
                    type: string;
                    maxLength: number;
                };
                extraConfig: {
                    type: string;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    "brand-info": {
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
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                site: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                    inversedBy: string;
                };
                companyName: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                    localized: boolean;
                };
                shortName: {
                    type: string;
                    maxLength: number;
                    localized: boolean;
                };
                slogan: {
                    type: string;
                    maxLength: number;
                    localized: boolean;
                };
                logo: {
                    type: string;
                };
                logoDark: {
                    type: string;
                };
                favicon: {
                    type: string;
                };
                description: {
                    type: string;
                    localized: boolean;
                };
                foundingDate: {
                    type: string;
                };
                registeredAddress: {
                    type: string;
                    maxLength: number;
                    localized: boolean;
                };
                officeAddress: {
                    type: string;
                    maxLength: number;
                    localized: boolean;
                };
                contactPhone: {
                    type: string;
                    maxLength: number;
                };
                contactEmail: {
                    type: string;
                };
                serviceHotline: {
                    type: string;
                    maxLength: number;
                };
                businessHours: {
                    type: string;
                    maxLength: number;
                };
                wechatQrCode: {
                    type: string;
                };
                wechatPublicAccount: {
                    type: string;
                    maxLength: number;
                };
                miniProgramName: {
                    type: string;
                    maxLength: number;
                };
                socialLinks: {
                    type: string;
                };
                legalRepresentative: {
                    type: string;
                    maxLength: number;
                };
                registeredCapital: {
                    type: string;
                    maxLength: number;
                };
                unifiedSocialCreditCode: {
                    type: string;
                    maxLength: number;
                };
                businessScope: {
                    type: string;
                    localized: boolean;
                };
                mainEntity: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    article: {
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
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                site: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                    inversedBy: string;
                };
                title: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                    localized: boolean;
                };
                slug: {
                    type: string;
                    targetField: string;
                    required: boolean;
                    localized: boolean;
                };
                excerpt: {
                    type: string;
                    localized: boolean;
                };
                content: {
                    type: string;
                    required: boolean;
                    localized: boolean;
                };
                coverImage: {
                    type: string;
                };
                category: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                tags: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                author: {
                    type: string;
                    maxLength: number;
                };
                authorTitle: {
                    type: string;
                    maxLength: number;
                };
                isFeatured: {
                    type: string;
                    default: boolean;
                };
                isPinned: {
                    type: string;
                    default: boolean;
                };
                viewCount: {
                    type: string;
                    default: number;
                };
                likeCount: {
                    type: string;
                    default: number;
                };
                collectCount: {
                    type: string;
                    default: number;
                };
                shareCount: {
                    type: string;
                    default: number;
                };
                readingTime: {
                    type: string;
                };
                wordCount: {
                    type: string;
                };
                seoTitle: {
                    type: string;
                    maxLength: number;
                    localized: boolean;
                };
                seoDescription: {
                    type: string;
                    maxLength: number;
                    localized: boolean;
                };
                seoKeywords: {
                    type: string;
                    maxLength: number;
                    localized: boolean;
                };
                canonicalUrl: {
                    type: string;
                    maxLength: number;
                    localized: boolean;
                };
                ogTitle: {
                    type: string;
                    maxLength: number;
                    localized: boolean;
                };
                ogDescription: {
                    type: string;
                    localized: boolean;
                };
                ogImage: {
                    type: string;
                };
                ogType: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                twitterCard: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                schemaType: {
                    type: string;
                    maxLength: number;
                };
                schemaJson: {
                    type: string;
                    localized: boolean;
                };
                allowIndex: {
                    type: string;
                    default: boolean;
                };
                noFollow: {
                    type: string;
                    default: boolean;
                };
                sitemapPriority: {
                    type: string;
                    default: number;
                };
                sitemapFrequency: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                sourceType: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                sourceUrl: {
                    type: string;
                };
                sourceArticleDraft: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                mainEntity: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                mentionedEntities: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                structuredData: {
                    type: string;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                publishedAt: {
                    type: string;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    "article-category": {
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
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                site: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                    inversedBy: string;
                };
                name: {
                    type: string;
                    maxLength: number;
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
                articles: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                tutorials: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                faqs: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                downloads: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                products: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                order: {
                    type: string;
                    default: number;
                };
                seoTitle: {
                    type: string;
                    maxLength: number;
                    localized: boolean;
                };
                seoDescription: {
                    type: string;
                    maxLength: number;
                    localized: boolean;
                };
                status: {
                    type: string;
                    default: boolean;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    product: {
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
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                site: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                    inversedBy: string;
                };
                name: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                    localized: boolean;
                };
                slug: {
                    type: string;
                    targetField: string;
                    required: boolean;
                    localized: boolean;
                };
                tagline: {
                    type: string;
                    maxLength: number;
                    localized: boolean;
                };
                description: {
                    type: string;
                    localized: boolean;
                };
                content: {
                    type: string;
                    localized: boolean;
                };
                coverImage: {
                    type: string;
                };
                images: {
                    type: string;
                    multiple: boolean;
                };
                category: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                tags: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                features: {
                    type: string;
                    localized: boolean;
                };
                specifications: {
                    type: string;
                    localized: boolean;
                };
                scenarios: {
                    type: string;
                };
                priceRange: {
                    type: string;
                    maxLength: number;
                };
                priceUnit: {
                    type: string;
                    maxLength: number;
                };
                isFeatured: {
                    type: string;
                    default: boolean;
                };
                viewCount: {
                    type: string;
                    default: number;
                };
                seoTitle: {
                    type: string;
                    maxLength: number;
                    localized: boolean;
                };
                seoDescription: {
                    type: string;
                    maxLength: number;
                    localized: boolean;
                };
                seoKeywords: {
                    type: string;
                    maxLength: number;
                    localized: boolean;
                };
                canonicalUrl: {
                    type: string;
                    maxLength: number;
                };
                ogImage: {
                    type: string;
                };
                allowIndex: {
                    type: string;
                    default: boolean;
                };
                sitemapPriority: {
                    type: string;
                    default: number;
                };
                sitemapFrequency: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                mainEntity: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                mentionedEntities: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                cases: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                structuredData: {
                    type: string;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                publishedAt: {
                    type: string;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    case: {
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
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                site: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                    inversedBy: string;
                };
                title: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                    localized: boolean;
                };
                slug: {
                    type: string;
                    targetField: string;
                    required: boolean;
                    localized: boolean;
                };
                clientName: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                    localized: boolean;
                };
                clientLogo: {
                    type: string;
                };
                clientIndustry: {
                    type: string;
                    maxLength: number;
                };
                clientDescription: {
                    type: string;
                    localized: boolean;
                };
                challenge: {
                    type: string;
                    required: boolean;
                    localized: boolean;
                };
                solution: {
                    type: string;
                    required: boolean;
                    localized: boolean;
                };
                results: {
                    type: string;
                    required: boolean;
                    localized: boolean;
                };
                testimonial: {
                    type: string;
                    localized: boolean;
                };
                testimonialAuthor: {
                    type: string;
                    maxLength: number;
                };
                testimonialTitle: {
                    type: string;
                    maxLength: number;
                };
                coverImage: {
                    type: string;
                };
                images: {
                    type: string;
                    multiple: boolean;
                };
                tags: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                relatedProducts: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                isFeatured: {
                    type: string;
                    default: boolean;
                };
                viewCount: {
                    type: string;
                    default: number;
                };
                seoTitle: {
                    type: string;
                    maxLength: number;
                    localized: boolean;
                };
                seoDescription: {
                    type: string;
                    maxLength: number;
                    localized: boolean;
                };
                allowIndex: {
                    type: string;
                    default: boolean;
                };
                mainEntity: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                mentionedEntities: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                structuredData: {
                    type: string;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                publishedAt: {
                    type: string;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    compliance: {
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
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                site: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                    inversedBy: string;
                };
                title: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                    localized: boolean;
                };
                slug: {
                    type: string;
                    targetField: string;
                    required: boolean;
                    localized: boolean;
                };
                category: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                content: {
                    type: string;
                    required: boolean;
                    localized: boolean;
                };
                effectiveDate: {
                    type: string;
                };
                expiryDate: {
                    type: string;
                };
                tags: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                isPinned: {
                    type: string;
                    default: boolean;
                };
                seoTitle: {
                    type: string;
                    maxLength: number;
                    localized: boolean;
                };
                seoDescription: {
                    type: string;
                    maxLength: number;
                    localized: boolean;
                };
                allowIndex: {
                    type: string;
                    default: boolean;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                publishedAt: {
                    type: string;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    faq: {
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
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                site: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                    inversedBy: string;
                };
                question: {
                    type: string;
                    required: boolean;
                    localized: boolean;
                };
                answer: {
                    type: string;
                    required: boolean;
                    localized: boolean;
                };
                slug: {
                    type: string;
                    targetField: string;
                    required: boolean;
                };
                category: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                tags: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                order: {
                    type: string;
                    default: number;
                };
                isFeatured: {
                    type: string;
                    default: boolean;
                };
                viewCount: {
                    type: string;
                    default: number;
                };
                mainEntity: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                mentionedEntities: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                publishedAt: {
                    type: string;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    tutorial: {
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
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                site: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                    inversedBy: string;
                };
                title: {
                    type: string;
                    maxLength: number;
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
                coverImage: {
                    type: string;
                };
                steps: {
                    type: string;
                    required: boolean;
                    localized: boolean;
                };
                materials: {
                    type: string;
                };
                estimatedTime: {
                    type: string;
                    maxLength: number;
                };
                difficulty: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                result: {
                    type: string;
                    localized: boolean;
                };
                category: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                tags: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                order: {
                    type: string;
                    default: number;
                };
                isFeatured: {
                    type: string;
                    default: boolean;
                };
                viewCount: {
                    type: string;
                    default: number;
                };
                mainEntity: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                mentionedEntities: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                structuredData: {
                    type: string;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                publishedAt: {
                    type: string;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    download: {
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
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                site: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                    inversedBy: string;
                };
                name: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                    localized: boolean;
                };
                description: {
                    type: string;
                    localized: boolean;
                };
                file: {
                    type: string;
                    required: boolean;
                };
                fileType: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                fileSize: {
                    type: string;
                };
                category: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                tags: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                relatedContentType: {
                    type: string;
                    maxLength: number;
                };
                relatedContentId: {
                    type: string;
                };
                requireLead: {
                    type: string;
                    default: boolean;
                };
                downloadCount: {
                    type: string;
                    default: number;
                };
                isFeatured: {
                    type: string;
                    default: boolean;
                };
                order: {
                    type: string;
                    default: number;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                publishedAt: {
                    type: string;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    lead: {
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
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                site: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                    inversedBy: string;
                };
                type: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                contactName: {
                    type: string;
                    maxLength: number;
                };
                contactPhone: {
                    type: string;
                    maxLength: number;
                };
                contactEmail: {
                    type: string;
                };
                contactCompany: {
                    type: string;
                    maxLength: number;
                };
                contactTitle: {
                    type: string;
                    maxLength: number;
                };
                message: {
                    type: string;
                };
                sourceType: {
                    type: string;
                    maxLength: number;
                };
                sourceId: {
                    type: string;
                };
                sourceUrl: {
                    type: string;
                    maxLength: number;
                };
                downloadFileId: {
                    type: string;
                };
                utmSource: {
                    type: string;
                    maxLength: number;
                };
                utmMedium: {
                    type: string;
                    maxLength: number;
                };
                utmCampaign: {
                    type: string;
                    maxLength: number;
                };
                utmContent: {
                    type: string;
                    maxLength: number;
                };
                utmTerm: {
                    type: string;
                    maxLength: number;
                };
                referrer: {
                    type: string;
                    maxLength: number;
                };
                userAgent: {
                    type: string;
                    maxLength: number;
                };
                ipAddress: {
                    type: string;
                    maxLength: number;
                };
                assignedTo: {
                    type: string;
                    relation: string;
                    target: string;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                followUpRecords: {
                    type: string;
                };
                remark: {
                    type: string;
                };
                convertedAt: {
                    type: string;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    "visit-log": {
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
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                site: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                    inversedBy: string;
                };
                type: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                pageUrl: {
                    type: string;
                    maxLength: number;
                };
                pageTitle: {
                    type: string;
                    maxLength: number;
                };
                targetType: {
                    type: string;
                    maxLength: number;
                };
                targetId: {
                    type: string;
                };
                referrer: {
                    type: string;
                    maxLength: number;
                };
                referrerDomain: {
                    type: string;
                    maxLength: number;
                };
                searchKeyword: {
                    type: string;
                    maxLength: number;
                };
                utmSource: {
                    type: string;
                    maxLength: number;
                };
                utmMedium: {
                    type: string;
                    maxLength: number;
                };
                utmCampaign: {
                    type: string;
                    maxLength: number;
                };
                userAgent: {
                    type: string;
                    maxLength: number;
                };
                deviceType: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                browser: {
                    type: string;
                    maxLength: number;
                };
                os: {
                    type: string;
                    maxLength: number;
                };
                ipAddress: {
                    type: string;
                    maxLength: number;
                };
                country: {
                    type: string;
                    maxLength: number;
                };
                region: {
                    type: string;
                    maxLength: number;
                };
                city: {
                    type: string;
                    maxLength: number;
                };
                sessionId: {
                    type: string;
                    maxLength: number;
                };
                visitorId: {
                    type: string;
                    maxLength: number;
                };
                userId: {
                    type: string;
                    relation: string;
                    target: string;
                };
                dwellTime: {
                    type: string;
                };
                scrollDepth: {
                    type: string;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    interaction: {
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
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                site: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                    inversedBy: string;
                };
                type: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                targetType: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                targetId: {
                    type: string;
                    required: boolean;
                };
                visitorId: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                userId: {
                    type: string;
                    relation: string;
                    target: string;
                };
                ipAddress: {
                    type: string;
                    maxLength: number;
                };
                userAgent: {
                    type: string;
                    maxLength: number;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    "search-log": {
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
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                site: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                    inversedBy: string;
                };
                keyword: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                resultCount: {
                    type: string;
                    default: number;
                };
                visitorId: {
                    type: string;
                    maxLength: number;
                };
                ipAddress: {
                    type: string;
                    maxLength: number;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    "knowledge-entity": {
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
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                site: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                    inversedBy: string;
                };
                entityType: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                name: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                slug: {
                    type: string;
                    targetField: string;
                    required: boolean;
                };
                identifier: {
                    type: string;
                    maxLength: number;
                };
                description: {
                    type: string;
                };
                sameAs: {
                    type: string;
                };
                image: {
                    type: string;
                };
                url: {
                    type: string;
                    maxLength: number;
                };
                properties: {
                    type: string;
                };
                refTargetType: {
                    type: string;
                    maxLength: number;
                };
                refTargetId: {
                    type: string;
                };
                confidence: {
                    type: string;
                    default: number;
                };
                sourceType: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                lastVerifiedAt: {
                    type: string;
                };
                verificationStatus: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                verifiedBy: {
                    type: string;
                    relation: string;
                    target: string;
                };
                status: {
                    type: string;
                    default: boolean;
                };
                brandInfos: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                subjectRelations: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                objectRelations: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                faqMainEntities: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                faqMentions: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                tutorialMainEntities: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                tutorialMentions: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                articleMainEntities: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                articleMentions: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                firstTruthPolicies: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                productMainEntities: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                productMentions: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                caseMainEntities: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                caseMentions: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    "knowledge-relation": {
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
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                site: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                    inversedBy: string;
                };
                subjectEntity: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                    inversedBy: string;
                };
                predicate: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                objectEntity: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                objectValue: {
                    type: string;
                };
                objectText: {
                    type: string;
                };
                sourceUrl: {
                    type: string;
                    maxLength: number;
                };
                sourceType: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                confidence: {
                    type: string;
                    default: number;
                };
                lastVerifiedAt: {
                    type: string;
                };
                verificationStatus: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                status: {
                    type: string;
                    default: boolean;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    "ai-content-summary": {
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
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                site: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                    inversedBy: string;
                };
                targetType: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                targetId: {
                    type: string;
                    required: boolean;
                };
                summaryType: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                content: {
                    type: string;
                    required: boolean;
                };
                contentText: {
                    type: string;
                };
                language: {
                    type: string;
                    maxLength: number;
                    default: string;
                };
                version: {
                    type: string;
                    default: number;
                };
                generatedBy: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                aiProvider: {
                    type: string;
                    maxLength: number;
                };
                aiModel: {
                    type: string;
                    maxLength: number;
                };
                generatedAt: {
                    type: string;
                };
                verifiedAt: {
                    type: string;
                };
                verificationStatus: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                status: {
                    type: string;
                    default: boolean;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    "first-truth-policy": {
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
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                site: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                    inversedBy: string;
                };
                claim: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                claimKey: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                claimCategory: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                canonicalEntity: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                canonicalValue: {
                    type: string;
                    required: boolean;
                };
                canonicalValueType: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                canonicalSourceUrl: {
                    type: string;
                    maxLength: number;
                };
                canonicalSourceType: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                conflictResolution: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                lastVerifiedAt: {
                    type: string;
                    required: boolean;
                };
                verificationStatus: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                conflictDetails: {
                    type: string;
                };
                priority: {
                    type: string;
                    default: number;
                };
                status: {
                    type: string;
                    default: boolean;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
};
export default _default;
