declare const _default: {
    register: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => void;
    bootstrap: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => Promise<void>;
    destroy: ({ strapi: _strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => void;
    config: {
        default: {
            increaseRules: {
                daily_sign_in: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                daily_sign_in_streak: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {
                        streakMilestones: number[];
                        streakBonusPoints: number[];
                    };
                };
                daily_first_login: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                online_duration: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                browse_article: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                like_article: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                comment_article: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                share_article: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                watch_video: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                like_video: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                comment_video: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                share_video: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                click_ad: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                watch_ad: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                complete_lesson: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                complete_course: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                review_course: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                complete_quiz: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                quiz_perfect: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                quiz_pass: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                invite_register: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                invite_purchase: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                follow_official_account: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                join_community: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                new_user_reward: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                complete_profile: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                bind_phone: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                bind_wechat: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                birthday_reward: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                submit_feedback: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                report_violation: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                purchase_course: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                browse_page: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                task_complete: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                qr_scan_verify: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
            };
            decreaseRules: {
                redeem_gift: {
                    points: number;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                redeem_coupon: {
                    points: number;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                exchange_course: {
                    points: number;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                exchange_membership: {
                    points: number;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                lottery_cost: {
                    points: number;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                unlock_content: {
                    points: number;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                cancel_order_penalty: {
                    points: number;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                violation_penalty: {
                    points: number;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                refund_deduct: {
                    points: number;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                expiration_deduct: {
                    points: number;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
            };
            defaultOperator: string;
        };
    };
    controllers: {
        point: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            earn(ctx: any): Promise<void>;
            deduct(ctx: any): Promise<void>;
            balance(ctx: any): Promise<void>;
            records(ctx: any): Promise<void>;
            statistics(ctx: any): Promise<void>;
            redeem(ctx: any): Promise<void>;
            redeemRecords(ctx: any): Promise<void>;
            verifyPickup(ctx: any): Promise<void>;
            rules(ctx: any): Promise<void>;
            listProducts(ctx: any): Promise<void>;
            getProduct(ctx: any): Promise<void>;
            listPickupLocations(ctx: any): Promise<void>;
            getPickupLocation(ctx: any): Promise<void>;
            generateQRCode(ctx: any): Promise<void>;
            verifyByQRCode(ctx: any): Promise<void>;
            manualVerify(ctx: any): Promise<void>;
            getMyVerifications(ctx: any): Promise<void>;
            getEligibleActions(ctx: any): Promise<void>;
            getExchangeRate(ctx: any): Promise<void>;
            getFeatureFlags(ctx: any): Promise<void>;
            signIn(ctx: any): Promise<void>;
            getSignInStatus(ctx: any): Promise<void>;
            getTasks(ctx: any): Promise<void>;
        };
        "point-admin": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            findTypes(ctx: any): Promise<void>;
            findOneType(ctx: any): Promise<void>;
            createType(ctx: any): Promise<void>;
            updateType(ctx: any): Promise<void>;
            deleteType(ctx: any): Promise<void>;
            findRules(ctx: any): Promise<void>;
            findOneRule(ctx: any): Promise<void>;
            createRule(ctx: any): Promise<void>;
            updateRule(ctx: any): Promise<void>;
            deleteRule(ctx: any): Promise<void>;
            batchEnableRules(ctx: any): Promise<void>;
            findTemplates(ctx: any): Promise<void>;
            createTemplate(ctx: any): Promise<void>;
            updateTemplate(ctx: any): Promise<void>;
            deleteTemplate(ctx: any): Promise<void>;
            applyTemplate(ctx: any): Promise<void>;
            findRecords(ctx: any): Promise<void>;
            findOneRecord(ctx: any): Promise<void>;
            adminAdjust(ctx: any): Promise<void>;
            batchAdjust(ctx: any): Promise<void>;
            getRecordStats(ctx: any): Promise<void>;
            findRedemptions(ctx: any): Promise<void>;
            findOneRedemption(ctx: any): Promise<void>;
            updateRedemption(ctx: any): Promise<void>;
            findProducts(ctx: any): Promise<void>;
            findOneProduct(ctx: any): Promise<void>;
            createProduct(ctx: any): Promise<void>;
            updateProduct(ctx: any): Promise<void>;
            deleteProduct(ctx: any): Promise<void>;
            adjustStock(ctx: any): Promise<void>;
            findPickupLocations(ctx: any): Promise<void>;
            findOnePickupLocation(ctx: any): Promise<void>;
            createPickupLocation(ctx: any): Promise<void>;
            updatePickupLocation(ctx: any): Promise<void>;
            deletePickupLocation(ctx: any): Promise<void>;
            getConfig(ctx: any): Promise<void>;
            updateConfig(ctx: any): Promise<void>;
            findVerifications(ctx: any): Promise<void>;
            findOneVerification(ctx: any): Promise<void>;
            getVerificationStats(ctx: any): Promise<void>;
            findSignInRecords(ctx: any): Promise<void>;
            getDashboard(ctx: any): Promise<void>;
        };
    };
    contentTypes: {
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
    services: {
        point: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            earnPoints: (params: import('./services/point').EarnPointsParams) => Promise<any>;
            earnCustomPoints: (params: {
                userId: string | number;
                action: string;
                points: number;
                source?: string;
                remark?: string;
                channelId?: string | number;
                userChannelId?: string | number;
            }) => Promise<any>;
            deductPoints: (params: import('./services/point').DeductPointsParams) => Promise<any>;
            getBalance: (userId: string | number) => Promise<{
                balance: number;
                channelBalances: {
                    channelId: number;
                    channelName: string;
                    balance: number;
                }[];
                globalBalance: number;
            }>;
            getRecords: (userId: string | number, params?: {
                page?: number;
                pageSize?: number;
                action?: string;
                type?: string;
                startDate?: string;
                endDate?: string;
                channelId?: string | number;
            }) => Promise<{
                records: any[];
                total: number;
                balance: number;
                page: number;
                pageSize: number;
            }>;
            getStatistics: (userId: string | number) => Promise<{
                todayEarned: number;
                todaySpent: number;
                monthEarned: number;
                monthSpent: number;
                totalEarned: number;
                totalSpent: number;
                balance: number;
                expiringSoon: number;
            }>;
            adminAdjust: (params: import('./services/point').AdminAdjustParams) => Promise<any>;
            batchAdjust: (items: import('./services/point').BatchAdjustItem[], operatorId: string | number) => Promise<{
                success: any[];
                failed: any[];
                totalSuccess: number;
                totalFailed: number;
            }>;
            getExpiringPoints: (userId: string | number, withinDays: number) => Promise<{
                points: any;
                records: any[];
            }>;
            applyExpiryDeduction: (userId: string | number) => Promise<{
                deducted: number;
                records: any[];
            }>;
            getRules: (params?: {
                action?: string;
                category?: string;
                enabled?: boolean;
            }) => Promise<any[]>;
            findOneRule: (action: string) => Promise<any>;
            upsertRule: (data: {
                action: string;
                category: string;
                points: number;
                description?: string;
                limitPerDay?: number;
                limitPerUser?: number;
                limitPerDayPerUser?: number;
                isOneTime?: boolean;
                enabled?: boolean;
                priority?: number;
                taskGroup?: string;
                extraConfig?: any;
            }) => Promise<{
                action: string;
                category: string;
                points: number;
                description?: string;
                limitPerDay?: number;
                limitPerUser?: number;
                limitPerDayPerUser?: number;
                isOneTime?: boolean;
                enabled?: boolean;
                priority?: number;
                taskGroup?: string;
                extraConfig?: any;
            }>;
            deleteRule: (action: string) => Promise<{
                success: boolean;
            }>;
            getDefaultConfig: () => {
                increaseRules: {
                    daily_sign_in: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    daily_sign_in_streak: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {
                            streakMilestones: number[];
                            streakBonusPoints: number[];
                        };
                    };
                    daily_first_login: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    online_duration: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    browse_article: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    like_article: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    comment_article: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    share_article: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    watch_video: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    like_video: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    comment_video: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    share_video: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    click_ad: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    watch_ad: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    complete_lesson: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    complete_course: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    review_course: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    complete_quiz: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    quiz_perfect: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    quiz_pass: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    invite_register: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    invite_purchase: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    follow_official_account: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    join_community: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    new_user_reward: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    complete_profile: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    bind_phone: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    bind_wechat: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    birthday_reward: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    submit_feedback: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    report_violation: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    purchase_course: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    browse_page: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    task_complete: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    qr_scan_verify: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                };
                decreaseRules: {
                    redeem_gift: {
                        points: number;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    redeem_coupon: {
                        points: number;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    exchange_course: {
                        points: number;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    exchange_membership: {
                        points: number;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    lottery_cost: {
                        points: number;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    unlock_content: {
                        points: number;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    cancel_order_penalty: {
                        points: number;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    violation_penalty: {
                        points: number;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    refund_deduct: {
                        points: number;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    expiration_deduct: {
                        points: number;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                };
                defaultOperator: string;
            };
            listRecords: (params: {
                userId?: string;
                action?: string;
                type?: string;
                startDate?: string;
                endDate?: string;
                page: number;
                pageSize: number;
                extraWhere?: Record<string, any>;
            }) => Promise<{
                records: any[];
                total: number;
                page: number;
                pageSize: number;
            }>;
            findRecordByDocumentId: (documentId: string) => Promise<any>;
            findVerificationByDocumentId: (documentId: string) => Promise<any>;
            getMergedRule: (action: string) => Promise<any | null>;
            getTasks: (userId: number) => Promise<Record<string, any[]>>;
        };
        redemption: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            createProduct: (data: any) => Promise<any>;
            updateProduct: (id: string | number, data: any) => Promise<any>;
            deleteProduct: (id: string | number) => Promise<any>;
            getProducts: (filters?: {
                status?: string;
                deliveryType?: string;
                name?: string;
                page?: number;
                pageSize?: number;
                userId?: string | number;
                siteId?: string;
                extraWhere?: Record<string, any>;
            }) => Promise<{
                records: any[];
                total: number;
                page: number;
                pageSize: number;
            }>;
            getProduct: (id: string | number, userId?: string | number) => Promise<any>;
            adjustStock: (id: string | number, delta: number) => Promise<any>;
            createRedemption: (params: {
                userId: string | number;
                productId?: string | number;
                itemName?: string;
                pointsCost?: number;
                quantity?: number;
                deliveryType?: string;
                pickupLocationId?: string | number;
                receiverName?: string;
                receiverPhone?: string;
                receiverAddress?: string;
                remark?: string;
                channelId?: string | number;
                useGlobalPoints?: boolean;
                selectedChannels?: (string | number)[];
            }) => Promise<any>;
            reviewRedemption: (redemptionId: string | number, status: string, operatorId: string | number, extra?: {
                expressCompany?: string;
                trackingNumber?: string;
            }) => Promise<any>;
            getRedemptions: (filters?: {
                status?: string;
                userId?: string | number;
                deliveryType?: string;
                page?: number;
                pageSize?: number;
                startDate?: string;
                endDate?: string;
                extraWhere?: Record<string, any>;
            }) => Promise<{
                records: any[];
                total: number;
                page: number;
                pageSize: number;
            }>;
            getRedemption: (id: string | number) => Promise<any>;
            getUserRedemptions: (userId: string | number, filters?: {
                status?: string;
                page?: number;
                pageSize?: number;
            }) => Promise<{
                records: any[];
                total: number;
                page: number;
                pageSize: number;
            }>;
            verifyRedemption: (pickupCode: string, operatorId: string | number) => Promise<any>;
        };
        "rule-engine": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            validateAction: (params: {
                userId: string | number;
                action: string;
                source?: string;
                channelId?: string | number;
            }) => Promise<{
                valid: boolean;
                rule: any;
                reason: string;
                todayCount?: undefined;
            } | {
                valid: boolean;
                rule: any;
                reason: string;
                todayCount: number;
            } | {
                valid: boolean;
                rule: any;
                reason?: undefined;
                todayCount?: undefined;
            }>;
            getEligibleActions: (userId: string | number, channelId?: string | number) => Promise<any[]>;
            getTemplates: (filters?: {
                category?: string;
                enabled?: boolean;
            }) => Promise<any[]>;
            createTemplate: (data: any) => Promise<any>;
            updateTemplate: (id: string | number, data: any) => Promise<any>;
            deleteTemplate: (id: string | number) => Promise<any>;
            applyTemplate: (templateId: string | number, targetAction: string) => Promise<any>;
            batchEnableActions: (actions: string[], enabled: boolean) => Promise<{
                updated: number;
            }>;
        };
        verification: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            generateQRCode: (params: {
                verifierId: string | number;
                channelId: string | number;
                direction: "superior_to_subordinate" | "subordinate_to_superior";
            }) => Promise<{
                token: string;
                qrCodeData: string;
                expiresAt: string;
                verificationId: any;
            }>;
            verifyByQRCode: (params: {
                token: string;
                verifiedUserId: string | number;
                verifierId?: string | number;
                location?: {
                    lat: number;
                    lng: number;
                };
            }) => Promise<any>;
            manualVerify: (params: {
                verifierId: string | number;
                verifiedUserId: string | number;
                channelId: string | number;
                direction: "superior_to_subordinate" | "subordinate_to_superior";
                remark?: string;
            }) => Promise<any>;
            verifyChannelHierarchy: (params: {
                verifierId: string | number;
                verifiedUserId: string | number;
                channelId: string | number;
            }) => Promise<any>;
            getVerificationLog: (filters?: {
                verifierId?: string | number;
                verifiedUserId?: string | number;
                channelId?: string | number;
                direction?: string;
                status?: string;
                method?: string;
                startDate?: string;
                endDate?: string;
                page?: number;
                pageSize?: number;
                extraWhere?: Record<string, any>;
            }) => Promise<{
                records: any[];
                total: number;
                page: number;
                pageSize: number;
            }>;
            getVerificationStats: (channelId?: string | number) => Promise<{
                totalVerifications: number;
                approved: number;
                rejected: number;
                pending: number;
                byDirection: {
                    superiorToSubordinate: number;
                    subordinateToSuperior: number;
                };
            }>;
        };
        "config-service": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            getConfig: () => Promise<any>;
            updateConfig: (data: any) => Promise<any>;
            isModuleEnabled: (moduleName?: "earn" | "redeem" | "expiry") => Promise<boolean>;
            getDashboardStats: () => Promise<{
                totalUsers: number;
                activeUsersToday: number;
                activeUsers: number;
                totalPointsIssued: number;
                totalIssued: number;
                totalPointsSpent: number;
                totalRedeemed: number;
                totalBalance: number;
                pendingRedemptions: number;
                pendingPickups: number;
                pickupLocationCount: number;
                expiringSoonPoints: number;
                topEarnActions: {
                    count: number;
                    totalPoints: number;
                    action: string;
                }[];
            }>;
            findTypes: (filters?: any) => Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
            findOneType: (documentId: string) => Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            createType: (data: any) => Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            updateType: (documentId: string, data: any) => Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            deleteType: (documentId: string) => Promise<{
                documentId: import('@strapi/types/dist/modules/documents').ID;
                entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
            }>;
        };
        "sign-in": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            signIn: (userId: number) => Promise<{
                signInDate: string;
                streakDays: any;
                pointsEarned: number;
                isStreakReward: boolean;
            }>;
            getSignInStatus: (userId: number) => Promise<{
                isSignedInToday: boolean;
                streakDays: number;
                recentDates: any[];
            }>;
        };
    };
    routes: {
        "content-api": {
            type: string;
            routes: {
                method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
                path: string;
                handler: string;
                config: {
                    auth: boolean;
                };
            }[];
        };
    };
    policies: {};
    middlewares: {};
};
export default _default;
