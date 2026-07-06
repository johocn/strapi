declare const _default: {
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
export default _default;
