declare const _default: {
    contentTypes: {
        'wealth-company': {
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
                    name: {
                        type: string;
                        required: boolean;
                    };
                    shortName: {
                        type: string;
                    };
                    companyType: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    website: {
                        type: string;
                    };
                    products: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    status: {
                        type: string;
                        default: boolean;
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
        'wealth-product': {
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
                    productCode: {
                        type: string;
                        unique: boolean;
                        required: boolean;
                    };
                    productName: {
                        type: string;
                        required: boolean;
                    };
                    productType: {
                        type: string;
                        enum: string[];
                        required: boolean;
                    };
                    registerCode: {
                        type: string;
                        unique: boolean;
                    };
                    riskLevel: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    termType: {
                        type: string;
                        enum: string[];
                    };
                    issueDate: {
                        type: string;
                    };
                    maturityDate: {
                        type: string;
                    };
                    company: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    navs: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    moneyIncomes: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    annualSnapshots: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    yearlyReturns: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    riskMetrics: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    recommendWeight: {
                        type: string;
                        default: number;
                    };
                    recommendTags: {
                        type: string;
                    };
                    recommendEnabled: {
                        type: string;
                        default: boolean;
                    };
                    recommendReason: {
                        type: string;
                    };
                    status: {
                        type: string;
                        default: boolean;
                    };
                    benchmark: {
                        type: string;
                    };
                    remark: {
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
        'wealth-collect-config': {
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
                    product: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    collectMethod: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    collectUrl: {
                        type: string;
                    };
                    collectRules: {
                        type: string;
                    };
                    collectStatus: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    lastCollectTime: {
                        type: string;
                    };
                    failCount: {
                        type: string;
                        default: number;
                    };
                    failReason: {
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
        'wealth-nav': {
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
                    product: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    navDate: {
                        type: string;
                        required: boolean;
                    };
                    unitNav: {
                        type: string;
                        precision: number;
                        scale: number;
                    };
                    accNav: {
                        type: string;
                        precision: number;
                        scale: number;
                    };
                    dataSource: {
                        type: string;
                        enum: string[];
                        default: string;
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
        'wealth-money-income': {
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
                    product: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    incomeDate: {
                        type: string;
                        required: boolean;
                    };
                    tenThousandIncome: {
                        type: string;
                        precision: number;
                        scale: number;
                    };
                    sevenDayAnnual: {
                        type: string;
                        precision: number;
                        scale: number;
                    };
                    dataSource: {
                        type: string;
                        enum: string[];
                        default: string;
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
        'wealth-annual-snapshot': {
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
                    product: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    snapshotDate: {
                        type: string;
                        required: boolean;
                    };
                    annual1d: {
                        type: string;
                        precision: number;
                        scale: number;
                    };
                    annual3d: {
                        type: string;
                        precision: number;
                        scale: number;
                    };
                    annual7d: {
                        type: string;
                        precision: number;
                        scale: number;
                    };
                    annual2w: {
                        type: string;
                        precision: number;
                        scale: number;
                    };
                    annual1m: {
                        type: string;
                        precision: number;
                        scale: number;
                    };
                    annual3m: {
                        type: string;
                        precision: number;
                        scale: number;
                    };
                    annual6m: {
                        type: string;
                        precision: number;
                        scale: number;
                    };
                    annual1y: {
                        type: string;
                        precision: number;
                        scale: number;
                    };
                    isEstimate: {
                        type: string;
                        default: boolean;
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
        'wealth-yearly-return': {
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
                    product: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    year: {
                        type: string;
                        required: boolean;
                    };
                    annualReturn: {
                        type: string;
                        precision: number;
                        scale: number;
                    };
                    baseDays: {
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
        'wealth-customer-product': {
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
                    user: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    product: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    channel: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    followTime: {
                        type: string;
                    };
                    sortOrder: {
                        type: string;
                        default: number;
                    };
                    remark: {
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
        'wealth-recommend-config': {
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
                    product: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    channel: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    recommendOrder: {
                        type: string;
                        default: number;
                    };
                    recommendReason: {
                        type: string;
                    };
                    status: {
                        type: string;
                        default: boolean;
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
        'wealth-risk-metric': {
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
                    product: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    snapshotDate: {
                        type: string;
                        required: boolean;
                    };
                    period: {
                        type: string;
                        enum: string[];
                        required: boolean;
                    };
                    metricName: {
                        type: string;
                        enum: string[];
                        required: boolean;
                    };
                    metricValue: {
                        type: string;
                        precision: number;
                        scale: number;
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
    };
    controllers: {
        product: ({ strapi }: {
            strapi: any;
        }) => {
            list(ctx: any): Promise<void>;
            detail(ctx: any): Promise<void>;
        };
        nav: ({ strapi }: {
            strapi: any;
        }) => {
            timeSeries(ctx: any): Promise<void>;
        };
        annual: ({ strapi }: {
            strapi: any;
        }) => {
            snapshotTimeSeries(ctx: any): Promise<void>;
            yearlyReturns(ctx: any): Promise<void>;
        };
        recommend: ({ strapi }: {
            strapi: any;
        }) => {
            list(ctx: any): Promise<void>;
        };
        'customer-product': ({ strapi }: {
            strapi: any;
        }) => {
            list(ctx: any): Promise<void>;
            add(ctx: any): Promise<void>;
            remove(ctx: any): Promise<void>;
        };
        collect: ({ strapi }: {
            strapi: any;
        }) => {
            trigger(ctx: any): Promise<void>;
            status(ctx: any): Promise<void>;
            recalculate(ctx: any): Promise<void>;
        };
        'admin-api': ({ strapi }: {
            strapi: any;
        }) => {
            companiesList(ctx: any): Promise<void>;
            companyDetail(ctx: any): Promise<void>;
            companyCreate(ctx: any): Promise<void>;
            companyUpdate(ctx: any): Promise<void>;
            companyDelete(ctx: any): Promise<void>;
            productsList(ctx: any): Promise<void>;
            productDetail(ctx: any): Promise<void>;
            productCreate(ctx: any): Promise<void>;
            productUpdate(ctx: any): Promise<void>;
            productDelete(ctx: any): Promise<void>;
            collectConfigsList(ctx: any): Promise<void>;
            collectConfigUpdate(ctx: any): Promise<void>;
            navDataList(ctx: any): Promise<void>;
            navDataCreate(ctx: any): Promise<void>;
            navDataUpdate(ctx: any): Promise<void>;
            recommendConfigsList(ctx: any): Promise<void>;
            recommendConfigCreate(ctx: any): Promise<void>;
            recommendConfigUpdate(ctx: any): Promise<void>;
            recommendConfigDelete(ctx: any): Promise<void>;
            customerProductsList(ctx: any): Promise<void>;
            stats(ctx: any): Promise<void>;
            statsOverview(ctx: any): Promise<void>;
            statsAnomalies(ctx: any): Promise<void>;
            collect(ctx: any): Promise<void>;
            collectConfirm(ctx: any): Promise<void>;
            compareData(sourceData: any, officialData: any): {
                status: string;
                matchScore: number;
                differences: {
                    field: string;
                    sourceValue: string;
                    officialValue: string;
                    severity: "info" | "warning" | "error";
                    description: string;
                }[];
            };
        };
        'risk-metric': ({ strapi }: {
            strapi: any;
        }) => {
            getMetrics(ctx: any): Promise<void>;
            recalculate(ctx: any): Promise<void>;
            adminAggregate(ctx: any): Promise<void>;
            adminTrend(ctx: any): Promise<void>;
            adminPeers(ctx: any): Promise<void>;
        };
    };
    routes: {
        'content-api': () => {
            type: string;
            routes: {
                method: string;
                path: string;
                handler: string;
                config: {
                    policies: string[];
                };
            }[];
        };
        'admin-api': () => {
            type: string;
            routes: {
                method: string;
                path: string;
                handler: string;
            }[];
        };
    };
    services: {
        product: ({ strapi }: {
            strapi: any;
        }) => {
            findList(filters: any, page?: number, pageSize?: number): Promise<{
                list: any;
                page: number;
                pageSize: number;
                total: any;
            }>;
            findOne(id: number): Promise<any>;
            create(data: any): Promise<any>;
            update(id: number, data: any): Promise<any>;
            delete(id: number): Promise<any>;
        };
        'nav-calculator': ({ strapi }: {
            strapi: any;
        }) => {
            calculateSnapshot(productId: number, snapshotDate: Date): Promise<any>;
            calculateNavSnapshot(productId: number, snapshotDate: Date): Promise<any>;
            calculateMoneyFundSnapshot(productId: number, snapshotDate: Date): Promise<any>;
            recalculateSnapshots(productId: number, startDate: Date, endDate: Date): Promise<void>;
            recalculateAll(): Promise<void>;
        };
        'annual-snapshot': ({ strapi }: {
            strapi: any;
        }) => {
            getSnapshotTimeSeries(productId: number, startDate: Date, endDate: Date, page: number, pageSize: number): Promise<{
                list: any;
                page: number;
                pageSize: number;
                total: any;
            }>;
            getYearlyReturns(productId: number): Promise<any>;
            calculateYearlyReturn(productId: number, year: number): Promise<any>;
        };
        'recommend-service': ({ strapi }: {
            strapi: any;
        }) => {
            getRecommendations(userId: number, channelId: number, limit?: number): Promise<any[]>;
        };
        'customer-product': ({ strapi }: {
            strapi: any;
        }) => {
            getUserProducts(userId: number, page: number, pageSize: number): Promise<{
                list: any[];
                page: number;
                pageSize: number;
                total: any;
            }>;
            addProduct(userId: number, productId: number, channelId: number): Promise<any>;
            removeProduct(userId: number, customerProductId: number): Promise<any>;
            getChannelProductsStats(channelId: number): Promise<{
                productId: number;
                productName: string;
                followCount: number;
            }[]>;
        };
        'risk-metric-service': ({ strapi }: {
            strapi: any;
        }) => {
            calculateMetricsForPeriod(productId: number, snapshotDate: Date, period: string): Promise<{
                volatility: number | null;
                maxDrawdown: number | null;
                sharpe: number | null;
                annualReturn: number | null;
            }>;
            calculateRankPercentile(productId: number, snapshotDate: Date, period: string): Promise<number | null>;
            calculateAndSaveMetrics(productId: number, snapshotDate: Date): Promise<void>;
            calculateAllForDate(snapshotDate: Date): Promise<void>;
            recalculateAll(): Promise<void>;
            adminAggregate(productId: number, period: string): Promise<Record<string, number>>;
            adminTrend(productId: number): Promise<Record<string, {
                snapshotDate: string;
                period: string;
                volatility: number | null;
                maxDrawdown: number | null;
                sharpe: number | null;
                rankPercentile: number | null;
            }[]>>;
            adminPeers(period: string, metricName: string, limit?: number): Promise<any>;
        };
        stats: ({ strapi }: {
            strapi: any;
        }) => {
            getOverview(): Promise<{
                productCount: any;
                companyCount: any;
                collectSuccessRate: number;
                riskMetricCoverage: number;
                todayAnomaly: any;
            }>;
            getAnomalies(limit?: number): Promise<any[]>;
        };
    };
    policies: {
        'has-channel-access': (ctx: any, config: any, { strapi }: {
            strapi: any;
        }) => Promise<boolean>;
        'has-product-permission': (ctx: any, config: any, { strapi }: {
            strapi: any;
        }) => Promise<boolean>;
    };
    register: ({ strapi }: {
        strapi: any;
    }) => void;
    bootstrap: ({ strapi }: {
        strapi: any;
    }) => Promise<void>;
};
export default _default;
