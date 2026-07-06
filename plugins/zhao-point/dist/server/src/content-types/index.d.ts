declare const _default: {
    "point-record": {
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
                comment: string;
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
                user: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                };
                action: {
                    type: string;
                    required: boolean;
                };
                type: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                points: {
                    type: string;
                    required: boolean;
                };
                balance: {
                    type: string;
                    required: boolean;
                };
                source: {
                    type: string;
                    maxLength: number;
                };
                method: {
                    type: string;
                    maxLength: number;
                };
                orderId: {
                    type: string;
                    maxLength: number;
                };
                remark: {
                    type: string;
                };
                operator: {
                    type: string;
                    relation: string;
                    target: string;
                };
                expiresAt: {
                    type: string;
                };
                expiredAt: {
                    type: string;
                };
                channel: {
                    type: string;
                    relation: string;
                    target: string;
                };
                userChannel: {
                    type: string;
                    relation: string;
                    target: string;
                };
            };
        };
    };
    "point-rule": {
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
                comment: string;
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
                action: {
                    type: string;
                    required: boolean;
                    unique: boolean;
                };
                category: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                points: {
                    type: string;
                    required: boolean;
                };
                description: {
                    type: string;
                    maxLength: number;
                };
                enabled: {
                    type: string;
                    default: boolean;
                };
                limitPerDay: {
                    type: string;
                    default: number;
                };
                limitPerUser: {
                    type: string;
                    default: number;
                };
                limitPerDayPerUser: {
                    type: string;
                    default: number;
                };
                isOneTime: {
                    type: string;
                    default: boolean;
                };
                startTime: {
                    type: string;
                };
                endTime: {
                    type: string;
                };
                applicableChannels: {
                    type: string;
                };
                priority: {
                    type: string;
                    default: number;
                };
                taskGroup: {
                    type: string;
                    enum: string[];
                    default: string;
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
    "point-redemption": {
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
                comment: string;
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
                user: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                };
                product: {
                    type: string;
                    relation: string;
                    target: string;
                };
                itemName: {
                    type: string;
                    maxLength: number;
                    required: boolean;
                };
                pointsCost: {
                    type: string;
                    required: boolean;
                };
                quantity: {
                    type: string;
                    default: number;
                };
                totalCost: {
                    type: string;
                    required: boolean;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                deliveryType: {
                    type: string;
                    enum: string[];
                };
                pickupCode: {
                    type: string;
                    maxLength: number;
                };
                pickupLocation: {
                    type: string;
                    relation: string;
                    target: string;
                };
                salesMode: {
                    type: string;
                    enum: string[];
                };
                priceAmount: {
                    type: string;
                    precision: number;
                    scale: number;
                };
                pointsAmount: {
                    type: string;
                };
                expressCompany: {
                    type: string;
                    maxLength: number;
                };
                trackingNumber: {
                    type: string;
                    maxLength: number;
                };
                receiverName: {
                    type: string;
                    maxLength: number;
                };
                receiverPhone: {
                    type: string;
                    maxLength: number;
                };
                receiverAddress: {
                    type: string;
                };
                remark: {
                    type: string;
                };
                operator: {
                    type: string;
                    relation: string;
                    target: string;
                };
                completedAt: {
                    type: string;
                };
                channel: {
                    type: string;
                    relation: string;
                    target: string;
                };
                deductionDetail: {
                    type: string;
                };
                deletedAt: {
                    type: string;
                    default: any;
                };
            };
        };
    };
    "point-product": {
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
                comment: string;
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
                    maxLength: number;
                    required: boolean;
                };
                subtitle: {
                    type: string;
                    maxLength: number;
                };
                description: {
                    type: string;
                };
                detail: {
                    type: string;
                };
                category: {
                    type: string;
                    maxLength: number;
                };
                coverImage: {
                    type: string;
                    multiple: boolean;
                    required: boolean;
                    allowedTypes: string[];
                };
                images: {
                    type: string;
                    multiple: boolean;
                    required: boolean;
                    allowedTypes: string[];
                };
                video: {
                    type: string;
                    multiple: boolean;
                    required: boolean;
                    allowedTypes: string[];
                };
                pointsCost: {
                    type: string;
                    required: boolean;
                };
                originalPrice: {
                    type: string;
                    precision: number;
                    scale: number;
                };
                stock: {
                    type: string;
                    default: number;
                };
                totalStock: {
                    type: string;
                    default: number;
                };
                deliveryType: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                salesMode: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                price: {
                    type: string;
                    precision: number;
                    scale: number;
                };
                channel: {
                    type: string;
                    relation: string;
                    target: string;
                };
                allowCrossChannel: {
                    type: string;
                    default: boolean;
                };
                allowGlobalPoints: {
                    type: string;
                    default: boolean;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                maxPerUser: {
                    type: string;
                    default: number;
                };
                sortOrder: {
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
    "point-config": {
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
                comment: string;
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
                moduleEnabled: {
                    type: string;
                    default: boolean;
                };
                earnEnabled: {
                    type: string;
                    default: boolean;
                };
                redeemEnabled: {
                    type: string;
                    default: boolean;
                };
                expiryEnabled: {
                    type: string;
                    default: boolean;
                };
                expiryDays: {
                    type: string;
                    default: number;
                };
                expiryReminderDays: {
                    type: string;
                    default: number;
                };
                minRedeemPoints: {
                    type: string;
                    default: number;
                };
                maxDailyEarn: {
                    type: string;
                    default: number;
                };
                defaultExchangeRate: {
                    type: string;
                    precision: number;
                    scale: number;
                    default: number;
                };
                remark: {
                    type: string;
                };
                signInEnabled: {
                    type: string;
                    default: boolean;
                };
                tasksEnabled: {
                    type: string;
                    default: boolean;
                };
                quizRetryEnabled: {
                    type: string;
                    default: boolean;
                };
                quizMaxRetryCount: {
                    type: string;
                    default: number;
                };
                maxDailyQuiz: {
                    type: string;
                    default: number;
                };
                tencentMapKey: {
                    type: string;
                };
            };
        };
    };
    "channel-verification": {
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
                comment: string;
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
                verifier: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                };
                verifiedUser: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                };
                channel: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                };
                direction: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                method: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                qrCodeToken: {
                    type: string;
                    maxLength: number;
                    unique: boolean;
                };
                qrCodeExpiresAt: {
                    type: string;
                };
                location: {
                    type: string;
                };
                remark: {
                    type: string;
                };
                verifiedAt: {
                    type: string;
                };
            };
        };
    };
    "rule-template": {
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
                comment: string;
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
                    maxLength: number;
                    required: boolean;
                };
                description: {
                    type: string;
                };
                category: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                defaultPoints: {
                    type: string;
                    default: number;
                };
                defaultLimitPerDay: {
                    type: string;
                    default: number;
                };
                defaultIsOneTime: {
                    type: string;
                    default: boolean;
                };
                configSchema: {
                    type: string;
                    required: boolean;
                };
                builtIn: {
                    type: string;
                    default: boolean;
                };
                enabled: {
                    type: string;
                    default: boolean;
                };
            };
        };
    };
    "point-type": {
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
                comment: string;
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
                description: {
                    type: string;
                    maxLength: number;
                };
                enabled: {
                    type: string;
                    default: boolean;
                };
                canExpire: {
                    type: string;
                    default: boolean;
                };
                expireDays: {
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
    "sign-in-record": {
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
                comment: string;
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
                user: {
                    type: string;
                    relation: string;
                    target: string;
                    required: boolean;
                };
                signInDate: {
                    type: string;
                    required: boolean;
                };
                streakDays: {
                    type: string;
                    default: number;
                };
                pointsEarned: {
                    type: string;
                    default: number;
                };
                isStreakReward: {
                    type: string;
                    default: boolean;
                };
            };
        };
    };
    "pickup-location": {
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
                comment: string;
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
                    maxLength: number;
                    required: boolean;
                };
                address: {
                    type: string;
                };
                latitude: {
                    type: string;
                    precision: number;
                    scale: number;
                };
                longitude: {
                    type: string;
                    precision: number;
                    scale: number;
                };
                phone: {
                    type: string;
                    maxLength: number;
                };
                businessHours: {
                    type: string;
                    maxLength: number;
                };
                businessLicense: {
                    type: string;
                    multiple: boolean;
                    required: boolean;
                    allowedTypes: string[];
                };
                coverImage: {
                    type: string;
                    multiple: boolean;
                    required: boolean;
                    allowedTypes: string[];
                };
                description: {
                    type: string;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                sortOrder: {
                    type: string;
                    default: number;
                };
                channels: {
                    type: string;
                    relation: string;
                    target: string;
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
