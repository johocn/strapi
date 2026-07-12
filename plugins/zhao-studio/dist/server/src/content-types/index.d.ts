declare const _default: {
    'article-draft': {
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
            pluginOptions: {
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                title: {
                    type: string;
                    required: boolean;
                    maxLength: number;
                };
                content: {
                    type: string;
                    required: boolean;
                };
                sourceUrl: {
                    type: string;
                };
                sourceTitle: {
                    type: string;
                };
                sourcePublishedAt: {
                    type: string;
                };
                sourceAuthor: {
                    type: string;
                };
                category: {
                    type: string;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                aiProcessed: {
                    type: string;
                    default: boolean;
                };
                aiSummary: {
                    type: string;
                };
                aiOptimizedTitle: {
                    type: string;
                };
                publishRecords: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                browserLogs: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                statSummaries: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                websiteArticles: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                scope: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                scopeTenantId: {
                    type: string;
                };
                publishedAt: {
                    type: string;
                };
                createdAt: {
                    type: string;
                };
                updatedAt: {
                    type: string;
                };
            };
        };
    };
    'collect-source': {
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
            pluginOptions: {
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                name: {
                    type: string;
                    required: boolean;
                    maxLength: number;
                };
                url: {
                    type: string;
                    required: boolean;
                };
                type: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                template: {
                    type: string;
                };
                titleSelector: {
                    type: string;
                };
                contentSelector: {
                    type: string;
                };
                authorSelector: {
                    type: string;
                };
                dateSelector: {
                    type: string;
                };
                isActive: {
                    type: string;
                    default: boolean;
                };
                tasks: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                lastCollectedAt: {
                    type: string;
                };
                createdAt: {
                    type: string;
                };
                updatedAt: {
                    type: string;
                };
            };
        };
    };
    'collect-task': {
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
            pluginOptions: {
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                source: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                titles: {
                    type: string;
                };
                selectedTitles: {
                    type: string;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                error: {
                    type: string;
                };
                retryCount: {
                    type: string;
                    default: number;
                };
                createdAt: {
                    type: string;
                };
                updatedAt: {
                    type: string;
                };
            };
        };
    };
    'publish-platform': {
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
            pluginOptions: {
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                name: {
                    type: string;
                    required: boolean;
                    maxLength: number;
                };
                type: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                description: {
                    type: string;
                };
                isActive: {
                    type: string;
                    default: boolean;
                };
                accounts: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                createdAt: {
                    type: string;
                };
                updatedAt: {
                    type: string;
                };
            };
        };
    };
    'publish-account': {
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
            pluginOptions: {
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                name: {
                    type: string;
                    required: boolean;
                    maxLength: number;
                };
                platform: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                config: {
                    type: string;
                };
                isActive: {
                    type: string;
                    default: boolean;
                };
                publishRecords: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                lastPublishedAt: {
                    type: string;
                };
                createdAt: {
                    type: string;
                };
                updatedAt: {
                    type: string;
                };
            };
        };
    };
    'publish-record': {
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
            pluginOptions: {
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                article: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                account: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                externalId: {
                    type: string;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                error: {
                    type: string;
                };
                retryCount: {
                    type: string;
                    default: number;
                };
                publishedAt: {
                    type: string;
                };
                createdAt: {
                    type: string;
                };
                updatedAt: {
                    type: string;
                };
            };
        };
    };
    'knowledge-point-index': {
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
            pluginOptions: {
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
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
                knowledgePoint: {
                    type: string;
                    relation: string;
                    target: string;
                };
                createdAt: {
                    type: string;
                };
                updatedAt: {
                    type: string;
                };
            };
        };
    };
    'ad-slot': {
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
            pluginOptions: {
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                name: {
                    type: string;
                    required: boolean;
                };
                code: {
                    type: string;
                    required: boolean;
                    unique: boolean;
                };
                position: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                type: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                targetUrl: {
                    type: string;
                };
                productId: {
                    type: string;
                };
                imageUrl: {
                    type: string;
                };
                isActive: {
                    type: string;
                    default: boolean;
                };
                browserLogs: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                statSummaries: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
                createdAt: {
                    type: string;
                };
                updatedAt: {
                    type: string;
                };
            };
        };
    };
    'browser-log': {
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
            pluginOptions: {
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                eventType: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                article: {
                    type: string;
                    relation: string;
                    target: string;
                };
                adSlot: {
                    type: string;
                    relation: string;
                    target: string;
                };
                user: {
                    type: string;
                    relation: string;
                    target: string;
                };
                userId: {
                    type: string;
                };
                sessionId: {
                    type: string;
                    required: boolean;
                };
                isRegistered: {
                    type: string;
                    default: boolean;
                };
                registeredAt: {
                    type: string;
                };
                userAgent: {
                    type: string;
                };
                platform: {
                    type: string;
                };
                browser: {
                    type: string;
                };
                browserVersion: {
                    type: string;
                };
                os: {
                    type: string;
                };
                osVersion: {
                    type: string;
                };
                deviceType: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                screenWidth: {
                    type: string;
                };
                screenHeight: {
                    type: string;
                };
                language: {
                    type: string;
                };
                ip: {
                    type: string;
                };
                country: {
                    type: string;
                };
                city: {
                    type: string;
                };
                referrer: {
                    type: string;
                };
                referrerDomain: {
                    type: string;
                };
                readDuration: {
                    type: string;
                    default: number;
                };
                scrollDepth: {
                    type: string;
                    default: number;
                };
                timestamp: {
                    type: string;
                    required: boolean;
                };
                createdAt: {
                    type: string;
                };
            };
        };
    };
    'stat-summary': {
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
            pluginOptions: {
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                date: {
                    type: string;
                    required: boolean;
                };
                article: {
                    type: string;
                    relation: string;
                    target: string;
                };
                adSlot: {
                    type: string;
                    relation: string;
                    target: string;
                };
                summaryType: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                pv: {
                    type: string;
                    default: number;
                };
                uv: {
                    type: string;
                    default: number;
                };
                clickCount: {
                    type: string;
                    default: number;
                };
                clickRate: {
                    type: string;
                    default: number;
                };
                avgReadDuration: {
                    type: string;
                    default: number;
                };
                avgScrollDepth: {
                    type: string;
                    default: number;
                };
                deviceStats: {
                    type: string;
                };
                regionStats: {
                    type: string;
                };
                referrerStats: {
                    type: string;
                };
                createdAt: {
                    type: string;
                };
            };
        };
    };
    'sync-event': {
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
                sourceType: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                sourceContentType: {
                    type: string;
                    required: boolean;
                };
                sourceDocumentId: {
                    type: string;
                };
                sourceUrl: {
                    type: string;
                };
                sourceTitle: {
                    type: string;
                };
                targetDraftId: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                eventStatus: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                eventPayload: {
                    type: string;
                };
                resolvedAt: {
                    type: string;
                };
                resolvedBy: {
                    type: string;
                };
            };
        };
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map