declare const _default: {
    "quote-request": {
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
                trackingNo: {
                    type: string;
                    maxLength: number;
                };
                routeId: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                origin: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                destination: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                serviceProvider: {
                    type: string;
                    maxLength: number;
                };
                cargoType: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                weight: {
                    type: string;
                    required: boolean;
                };
                volume: {
                    type: string;
                };
                formData: {
                    type: string;
                    required: boolean;
                };
                quotedPrice: {
                    type: string;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                    required: boolean;
                };
                leadId: {
                    type: string;
                };
                customerName: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                customerContact: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                customerType: {
                    type: string;
                    enum: string[];
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
                lang: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                remark: {
                    type: string;
                };
                expiresAt: {
                    type: string;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    "quote-field-rule": {
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
                routeId: {
                    type: string;
                    maxLength: number;
                };
                serviceProvider: {
                    type: string;
                    maxLength: number;
                };
                customerType: {
                    type: string;
                    enum: string[];
                };
                isActive: {
                    type: string;
                    default: boolean;
                    required: boolean;
                };
                priority: {
                    type: string;
                    default: number;
                };
                fields: {
                    type: string;
                    required: boolean;
                    localized: boolean;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    "quote-price-rule": {
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
                routeId: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                serviceProvider: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                minWeight: {
                    type: string;
                    required: boolean;
                };
                maxWeight: {
                    type: string;
                    required: boolean;
                };
                pricePerKg: {
                    type: string;
                    required: boolean;
                };
                currency: {
                    type: string;
                    maxLength: number;
                    default: string;
                    required: boolean;
                };
                volumetricFactor: {
                    type: string;
                };
                minCharge: {
                    type: string;
                };
                surcharges: {
                    type: string;
                };
                formula: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                effectiveFrom: {
                    type: string;
                    required: boolean;
                };
                effectiveTo: {
                    type: string;
                };
                isActive: {
                    type: string;
                    default: boolean;
                    required: boolean;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    "quote-price-formula": {
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
                expression: {
                    type: string;
                    required: boolean;
                };
                variables: {
                    type: string;
                    required: boolean;
                };
                isActive: {
                    type: string;
                    default: boolean;
                    required: boolean;
                };
                price_rules: {
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
    "tracking-shipment": {
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
                trackingNo: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                orderId: {
                    type: string;
                    maxLength: number;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                    required: boolean;
                };
                origin: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                destination: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                serviceProvider: {
                    type: string;
                    maxLength: number;
                };
                eta: {
                    type: string;
                };
                actualDelivery: {
                    type: string;
                };
                customerName: {
                    type: string;
                    maxLength: number;
                };
                customerContact: {
                    type: string;
                    maxLength: number;
                };
                lastSyncAt: {
                    type: string;
                };
                syncProvider: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                nodes: {
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
    "tracking-node": {
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
                shipment: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                    inversedBy: string;
                };
                nodeStatus: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                nodeType: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                location: {
                    type: string;
                    maxLength: number;
                };
                eventTime: {
                    type: string;
                    required: boolean;
                };
                description: {
                    type: string;
                    required: boolean;
                    localized: boolean;
                };
                dataSource: {
                    type: string;
                    enum: string[];
                    default: string;
                    required: boolean;
                };
                providerRef: {
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
    "tracking-provider": {
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
                name: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                providerType: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                apiKey: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                apiSecret: {
                    type: string;
                    maxLength: number;
                };
                endpoint: {
                    type: string;
                    maxLength: number;
                };
                isEnabled: {
                    type: string;
                    default: boolean;
                    required: boolean;
                };
                rateLimit: {
                    type: string;
                };
                supportedCarriers: {
                    type: string;
                };
                extraConfig: {
                    type: string;
                };
                shipments: {
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
    "contact-matrix": {
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
                lang: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                flag: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                short: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                primary: {
                    type: string;
                    required: boolean;
                    localized: boolean;
                };
                channels: {
                    type: string;
                    required: boolean;
                    localized: boolean;
                };
                hotline: {
                    type: string;
                    required: boolean;
                    localized: boolean;
                };
                email: {
                    type: string;
                    required: boolean;
                };
                callbackNote: {
                    type: string;
                    localized: boolean;
                };
                isActive: {
                    type: string;
                    default: boolean;
                    required: boolean;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    review: {
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
                authorName: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                    localized: boolean;
                };
                authorCompany: {
                    type: string;
                    maxLength: number;
                };
                authorTitle: {
                    type: string;
                    maxLength: number;
                };
                authorCountry: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                routeId: {
                    type: string;
                    maxLength: number;
                };
                serviceProvider: {
                    type: string;
                    maxLength: number;
                };
                rating: {
                    type: string;
                    required: boolean;
                };
                content: {
                    type: string;
                    required: boolean;
                    localized: boolean;
                };
                videoUrl: {
                    type: string;
                    maxLength: number;
                };
                videoPoster: {
                    type: string;
                    multiple: boolean;
                };
                images: {
                    type: string;
                    multiple: boolean;
                };
                testimonialType: {
                    type: string;
                    enum: string[];
                    default: string;
                    required: boolean;
                };
                isVerified: {
                    type: string;
                    default: boolean;
                    required: boolean;
                };
                isFeatured: {
                    type: string;
                    default: boolean;
                };
                publishedAt: {
                    type: string;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                    required: boolean;
                };
                replyContent: {
                    type: string;
                    localized: boolean;
                };
                replyAt: {
                    type: string;
                };
                orderRef: {
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
    subscription: {
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
                subscriberType: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                channel: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                channelTarget: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                trackingNo: {
                    type: string;
                    maxLength: number;
                };
                quoteRequestId: {
                    type: string;
                };
                eventFilter: {
                    type: string;
                };
                frequency: {
                    type: string;
                    enum: string[];
                    default: string;
                    required: boolean;
                };
                isActive: {
                    type: string;
                    default: boolean;
                    required: boolean;
                };
                subscribedAt: {
                    type: string;
                    required: boolean;
                };
                unsubscribedAt: {
                    type: string;
                };
                language: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                lastNotifiedAt: {
                    type: string;
                };
                notifyCount: {
                    type: string;
                    default: number;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    "landing-page": {
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
                slug: {
                    type: string;
                    required: boolean;
                };
                title: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                    localized: boolean;
                };
                campaignName: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                utmSource: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                utmMedium: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                utmCampaign: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                utmContent: {
                    type: string;
                    maxLength: number;
                };
                utmTerm: {
                    type: string;
                    maxLength: number;
                };
                conversionGoal: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                heroContent: {
                    type: string;
                    required: boolean;
                    localized: boolean;
                };
                sections: {
                    type: string;
                    required: boolean;
                    localized: boolean;
                };
                formConfig: {
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
                ogImage: {
                    type: string;
                    multiple: boolean;
                };
                variant: {
                    type: string;
                    maxLength: number;
                };
                parentPageId: {
                    type: string;
                };
                isActive: {
                    type: string;
                    default: boolean;
                    required: boolean;
                };
                startAt: {
                    type: string;
                };
                endAt: {
                    type: string;
                };
                publishedAt: {
                    type: string;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                    required: boolean;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    "conversion-funnel": {
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
                name: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                lang: {
                    type: string;
                    maxLength: number;
                };
                steps: {
                    type: string;
                    required: boolean;
                };
                isActive: {
                    type: string;
                    default: boolean;
                    required: boolean;
                };
                events: {
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
    "conversion-event": {
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
                funnel: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                    inversedBy: string;
                };
                eventName: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                step: {
                    type: string;
                    required: boolean;
                };
                visitorId: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                user: {
                    type: string;
                    relation: string;
                    target: string;
                };
                sessionId: {
                    type: string;
                    maxLength: number;
                };
                landingPageId: {
                    type: string;
                };
                quoteRequestId: {
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
                lang: {
                    type: string;
                    maxLength: number;
                };
                ipAddress: {
                    type: string;
                    maxLength: number;
                };
                userAgent: {
                    type: string;
                    maxLength: number;
                };
                occurredAt: {
                    type: string;
                    required: boolean;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    "intent-order": {
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
                orderNo: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                quoteRequestId: {
                    type: string;
                    required: boolean;
                };
                customerName: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                customerContact: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                customerType: {
                    type: string;
                    enum: string[];
                };
                confirmedPrice: {
                    type: string;
                    required: boolean;
                };
                cargoSummary: {
                    type: string;
                    required: boolean;
                };
                routeSummary: {
                    type: string;
                    required: boolean;
                };
                plannedShipDate: {
                    type: string;
                };
                actualShipDate: {
                    type: string;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                    required: boolean;
                };
                assignedTo: {
                    type: string;
                    relation: string;
                    target: string;
                };
                followUpRecords: {
                    type: string;
                };
                contractSigned: {
                    type: string;
                    default: boolean;
                };
                depositPaid: {
                    type: string;
                    default: boolean;
                };
                depositAmount: {
                    type: string;
                };
                convertedToOrderId: {
                    type: string;
                };
                remark: {
                    type: string;
                };
                leadId: {
                    type: string;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    referral: {
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
                referralCode: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                referrerName: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                referrerContact: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                referrerCustomerId: {
                    type: string;
                };
                refereeName: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                refereeContact: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                refereeCustomerId: {
                    type: string;
                };
                referralChannel: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                referralSource: {
                    type: string;
                    maxLength: number;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                    required: boolean;
                };
                quoteRequestId: {
                    type: string;
                };
                intentOrderId: {
                    type: string;
                };
                rewardType: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                rewardAmount: {
                    type: string;
                };
                rewardStatus: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                rewardIssuedAt: {
                    type: string;
                };
                conversionValue: {
                    type: string;
                };
                convertedAt: {
                    type: string;
                };
                remark: {
                    type: string;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    "customer-profile": {
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
                name: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                contactPhone: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                contactEmail: {
                    type: string;
                    maxLength: number;
                };
                contactLine: {
                    type: string;
                    maxLength: number;
                };
                contactWechat: {
                    type: string;
                    maxLength: number;
                };
                contactKakao: {
                    type: string;
                    maxLength: number;
                };
                contactZalo: {
                    type: string;
                    maxLength: number;
                };
                company: {
                    type: string;
                    maxLength: number;
                };
                title: {
                    type: string;
                    maxLength: number;
                };
                customerType: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                country: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                preferredLang: {
                    type: string;
                    maxLength: number;
                };
                preferredRoute: {
                    type: string;
                };
                preferredService: {
                    type: string;
                };
                totalQuoteCount: {
                    type: string;
                    default: number;
                };
                totalOrderCount: {
                    type: string;
                    default: number;
                };
                totalOrderValue: {
                    type: string;
                    default: number;
                };
                lastQuoteAt: {
                    type: string;
                };
                lastOrderAt: {
                    type: string;
                };
                lifecycleStage: {
                    type: string;
                    enum: string[];
                    default: string;
                    required: boolean;
                };
                tags: {
                    type: string;
                };
                assignedTo: {
                    type: string;
                    relation: string;
                    target: string;
                };
                sourceChannel: {
                    type: string;
                    maxLength: number;
                };
                utmSource: {
                    type: string;
                    maxLength: number;
                };
                remark: {
                    type: string;
                };
                relatedLeadIds: {
                    type: string;
                };
                relatedQuoteIds: {
                    type: string;
                };
                relatedOrderIds: {
                    type: string;
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
