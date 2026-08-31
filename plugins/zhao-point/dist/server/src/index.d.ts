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
                activity_share: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {
                        intervalMinutes: number;
                    };
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
                activity_signup: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                activity_signup_auth: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                activity_signup_contact: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                activity_signup_survey: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                activity_attend: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                activity_share_reward: {
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
            earnShare(ctx: any): Promise<void>;
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
            shareStatus(ctx: any): Promise<void>;
            reportShareVisit(ctx: any): Promise<void>;
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
        activity: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(ctx: any): Promise<void>;
            categories(ctx: any): Promise<void>;
            detail(ctx: any): Promise<void>;
            myInvitation(ctx: any): Promise<void>;
            signup(ctx: any): Promise<void>;
            questionnaire(ctx: any): Promise<void>;
            contact(ctx: any): Promise<void>;
            subscribe(ctx: any): Promise<void>;
            getFollowQrcode(ctx: any): Promise<void>;
            signupUnlockStatus(ctx: any): Promise<void>;
            unlockCheck(ctx: any): Promise<void>;
            promoDetail(ctx: any): Promise<void>;
            sendMessage(ctx: any): Promise<void>;
            listMessages(ctx: any): Promise<void>;
            adminListMessages(ctx: any): Promise<void>;
            adminReplyMessage(ctx: any): Promise<void>;
            cancel(ctx: any): Promise<void>;
            checkin(ctx: any): Promise<void>;
            mySignups(ctx: any): Promise<void>;
            adminList(ctx: any): Promise<void>;
            adminCreate(ctx: any): Promise<void>;
            adminUpdate(ctx: any): Promise<void>;
            adminDelete(ctx: any): Promise<void>;
            adminSignups(ctx: any): Promise<void>;
            adminCancelSignup(ctx: any): Promise<void>;
            adminScanCheckin(ctx: any): Promise<void>;
            adminAttendance(ctx: any): Promise<void>;
            review(ctx: any): Promise<void>;
            adminClose(ctx: any): Promise<void>;
            adminArchive(ctx: any): Promise<void>;
            adminUnarchive(ctx: any): Promise<void>;
            listReviews(ctx: any): Promise<void>;
            learningContent(ctx: any): Promise<void>;
            tempLessonAuthStatus(ctx: any): Promise<void>;
            adminGrantTempLessonAuth(ctx: any): Promise<void>;
            adminListTempAuth(ctx: any): Promise<void>;
            adminToggleReviewHidden(ctx: any): Promise<void>;
            adminReviews(ctx: any): Promise<void>;
            fissionLeaderboard(ctx: any): Promise<void>;
        };
        series: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(ctx: any): Promise<void>;
            detail(ctx: any): Promise<void>;
            adminList(ctx: any): Promise<void>;
            adminFindOne(ctx: any): Promise<void>;
            adminCreate(ctx: any): Promise<void>;
            adminUpdate(ctx: any): Promise<void>;
            adminDelete(ctx: any): Promise<void>;
            adminActivities(ctx: any): Promise<void>;
            adminDuplicateActivity(ctx: any): Promise<void>;
            adminGenerate(ctx: any): Promise<void>;
        };
        calendar: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            month(ctx: any): Promise<void>;
            adminMonth(ctx: any): Promise<void>;
        };
        "activity-stats": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            overview(ctx: any): Promise<void>;
        };
        fee: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            preview(ctx: any): Promise<void>;
        };
        resource: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            lecturers: {
                list: (ctx: any) => Promise<void>;
                create: (ctx: any) => Promise<void>;
                findOne: (ctx: any) => Promise<void>;
                update: (ctx: any) => Promise<void>;
                del: (ctx: any) => Promise<void>;
            };
            venues: {
                list: (ctx: any) => Promise<void>;
                create: (ctx: any) => Promise<void>;
                findOne: (ctx: any) => Promise<void>;
                update: (ctx: any) => Promise<void>;
                del: (ctx: any) => Promise<void>;
            };
            schedules(ctx: any): Promise<void>;
            check(ctx: any): Promise<void>;
        };
        ledger: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(ctx: any): Promise<void>;
            regenerate(ctx: any): Promise<void>;
            settle(ctx: any): Promise<void>;
        };
        "resource.lecturers": (args: any) => {
            list: (ctx: any) => Promise<void>;
            create: (ctx: any) => Promise<void>;
            findOne: (ctx: any) => Promise<void>;
            update: (ctx: any) => Promise<void>;
            del: (ctx: any) => Promise<void>;
        };
        "resource.venues": (args: any) => {
            list: (ctx: any) => Promise<void>;
            create: (ctx: any) => Promise<void>;
            findOne: (ctx: any) => Promise<void>;
            update: (ctx: any) => Promise<void>;
            del: (ctx: any) => Promise<void>;
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
                    name: {
                        type: string;
                    };
                    icon: {
                        type: string;
                    };
                    linkType: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    linkTargetId: {
                        type: string;
                    };
                    linkTitle: {
                        type: string;
                    };
                    linkThumb: {
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
                    defaultShareRewardPoints: {
                        type: string;
                        default: number;
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
        activity: {
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
                    i18n: {
                        localized: boolean;
                    };
                };
                attributes: {
                    title: {
                        type: string;
                        required: boolean;
                    };
                    type: {
                        type: string;
                        default: string;
                    };
                    category: {
                        type: string;
                        default: string;
                    };
                    tags: {
                        type: string;
                    };
                    assets: {
                        type: string;
                    };
                    description: {
                        type: string;
                    };
                    startTime: {
                        type: string;
                    };
                    endTime: {
                        type: string;
                    };
                    venueName: {
                        type: string;
                    };
                    lat: {
                        type: string;
                    };
                    lng: {
                        type: string;
                    };
                    capacity: {
                        type: string;
                        required: boolean;
                        default: number;
                    };
                    usedCapacity: {
                        type: string;
                        default: number;
                    };
                    signupStart: {
                        type: string;
                    };
                    signupEnd: {
                        type: string;
                    };
                    signupAdvanceHours: {
                        type: string;
                        default: number;
                    };
                    checkinMode: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    geoEnforced: {
                        type: string;
                        default: boolean;
                    };
                    geoRadiusM: {
                        type: string;
                        default: number;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    channelScope: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    channelIds: {
                        type: string;
                    };
                    visibleToRoles: {
                        type: string;
                        default: any;
                    };
                    pointsCost: {
                        type: string;
                        default: number;
                    };
                    pricingMode: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    feeTiers: {
                        type: string;
                    };
                    feeFactors: {
                        type: string;
                    };
                    feeCollectAt: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    shareRewardPoints: {
                        type: string;
                    };
                    preUnlockArticles: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    preUnlockLessons: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    tempLessonMode: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    learningPackageArticles: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    learningPackageLessons: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    belongsToSeries: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    formConfig: {
                        type: string;
                    };
                    rewardConfig: {
                        type: string;
                    };
                    questionnaire: {
                        type: string;
                    };
                    preQuestionnaire: {
                        type: string;
                    };
                    remindLeadMinutes: {
                        type: string;
                        default: number;
                        min: number;
                    };
                    lecturer: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    venue: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    cashPrice: {
                        type: string;
                        default: number;
                    };
                    settleLecturer: {
                        type: string;
                        default: number;
                    };
                    settleVenue: {
                        type: string;
                        default: number;
                    };
                    promoTemplate: {
                        type: string;
                        default: string;
                    };
                    promoModules: {
                        type: string;
                    };
                    promoContact: {
                        type: string;
                    };
                    promoColors: {
                        type: string;
                    };
                    promoAssets: {
                        type: string;
                    };
                    customPromoHtml: {
                        type: string;
                    };
                    customPromoActive: {
                        type: string;
                        default: boolean;
                    };
                };
            };
            lifecycles: {
                afterCreate(event: any): Promise<void>;
                afterUpdate(event: any): Promise<void>;
                afterDelete(event: any): Promise<void>;
            };
        };
        "activity-signup": {
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
                    user: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    activity: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    pointsCharged: {
                        type: string;
                        default: number;
                    };
                    feeTierId: {
                        type: string;
                    };
                    signupAt: {
                        type: string;
                    };
                    attendedAt: {
                        type: string;
                    };
                    rating: {
                        type: string;
                        min: number;
                        max: number;
                    };
                    nps: {
                        type: string;
                        min: number;
                        max: number;
                    };
                    review: {
                        type: string;
                    };
                    reviewedAt: {
                        type: string;
                    };
                    reviewHidden: {
                        type: string;
                        default: boolean;
                    };
                    formData: {
                        type: string;
                    };
                    unlockInfo: {
                        type: string;
                    };
                    questionnaireData: {
                        type: string;
                    };
                    preQuestionnaireData: {
                        type: string;
                    };
                };
            };
        };
        "activity-attendance": {
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
                    signup: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    method: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    checkinAt: {
                        type: string;
                    };
                    lat: {
                        type: string;
                    };
                    lng: {
                        type: string;
                    };
                    geoPassed: {
                        type: string;
                        default: boolean;
                    };
                    pointsGranted: {
                        type: string;
                        default: boolean;
                    };
                };
            };
        };
        "activity-series": {
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
                    title: {
                        type: string;
                        required: boolean;
                    };
                    description: {
                        type: string;
                    };
                    cover: {
                        type: string;
                    };
                    sortOrder: {
                        type: string;
                        default: number;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    schedule: {
                        type: string;
                    };
                    activities: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    defaultRules: {
                        type: string;
                    };
                    tag: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                };
            };
            lifecycles: {
                afterCreate(event: any): Promise<void>;
                afterUpdate(event: any): Promise<void>;
            };
        };
        "activity-message": {
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
                    comment: string;
                };
                attributes: {
                    activity: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    user: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    content: {
                        type: string;
                    };
                    reply: {
                        type: string;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    repliedAt: {
                        type: string;
                    };
                };
            };
        };
        "activity-referral-reward": {
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
                    comment: string;
                };
                attributes: {
                    inviter: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    invitee: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    activity: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    points: {
                        type: string;
                        default: number;
                    };
                    sourceInviteCode: {
                        type: string;
                    };
                    issuedAt: {
                        type: string;
                    };
                };
            };
        };
        "activity-ledger": {
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
                attributes: {
                    activity: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    activityDocumentId: {
                        type: string;
                    };
                    activityTitle: {
                        type: string;
                    };
                    snapshotNo: {
                        type: string;
                        default: number;
                    };
                    source: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    generatedAt: {
                        type: string;
                    };
                    generatedBy: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    revenuePoints: {
                        type: string;
                        default: number;
                    };
                    signinCostPoints: {
                        type: string;
                        default: number;
                    };
                    referralCostPoints: {
                        type: string;
                        default: number;
                    };
                    netPoints: {
                        type: string;
                        default: number;
                    };
                    cashRevenue: {
                        type: string;
                        default: number;
                    };
                    cashExpense: {
                        type: string;
                        default: number;
                    };
                    cashNet: {
                        type: string;
                        default: number;
                    };
                    settleStatus: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    settledAt: {
                        type: string;
                    };
                    summary: {
                        type: string;
                    };
                    detail: {
                        type: string;
                    };
                };
            };
        };
        "activity-share-visit": {
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
                    comment: string;
                };
                attributes: {
                    inviter: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    targetType: {
                        type: string;
                        enum: string[];
                    };
                    targetId: {
                        type: string;
                    };
                    attemptId: {
                        type: string;
                    };
                    createdAt: {
                        type: string;
                    };
                };
            };
        };
        lecturer: {
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
                    i18n: {
                        localized: boolean;
                    };
                };
                attributes: {
                    name: {
                        type: string;
                        required: boolean;
                    };
                    desc: {
                        type: string;
                    };
                    defaultBufferMin: {
                        type: string;
                        default: number;
                    };
                    disabled: {
                        type: string;
                        default: boolean;
                    };
                    activities: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    cashMode: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    cashFee: {
                        type: string;
                        default: number;
                    };
                    tag: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                };
            };
            lifecycles: {
                afterCreate(event: any): Promise<void>;
                afterUpdate(event: any): Promise<void>;
            };
        };
        venue: {
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
                    i18n: {
                        localized: boolean;
                    };
                };
                attributes: {
                    name: {
                        type: string;
                        required: boolean;
                    };
                    desc: {
                        type: string;
                    };
                    defaultBufferMin: {
                        type: string;
                        default: number;
                    };
                    lat: {
                        type: string;
                    };
                    lng: {
                        type: string;
                    };
                    disabled: {
                        type: string;
                        default: boolean;
                    };
                    activities: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    cashMode: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    cashFee: {
                        type: string;
                        default: number;
                    };
                    tag: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                };
            };
            lifecycles: {
                afterCreate(event: any): Promise<void>;
                afterUpdate(event: any): Promise<void>;
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
            refundPoints: (params: {
                userId: string | number;
                action: string;
                points: number;
                source?: string;
                method?: string;
                remark?: string;
                orderId?: string;
                channelId?: string | number;
                userChannelId?: string | number;
            }) => Promise<any>;
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
                name?: string;
                icon?: string;
                linkType?: string;
                linkTargetId?: string;
                linkTitle?: string;
                linkThumb?: string;
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
                name?: string;
                icon?: string;
                linkType?: string;
                linkTargetId?: string;
                linkTitle?: string;
                linkThumb?: string;
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
                    activity_share: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {
                            intervalMinutes: number;
                        };
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
                    activity_signup: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    activity_signup_auth: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    activity_signup_contact: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    activity_signup_survey: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    activity_attend: {
                        points: number;
                        limitPerDay: number;
                        isOneTime: boolean;
                        description: string;
                        taskGroup: string;
                        extraConfig: {};
                    };
                    activity_share_reward: {
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
            getShareStatus: (params: {
                userId: number | string;
                activityId?: string | number | null;
            }) => Promise<{
                action: string;
                canClaim: boolean;
                points: number;
                remainingMs: number;
                dailyCount: number;
                dailyLimit: number;
                intervalMinutes: number;
            }>;
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
        activity: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            signup({ userId, activityId, formData, preQuestionnaireData, chosenRewards }: {
                userId: number;
                activityId: string;
                formData?: any;
                preQuestionnaireData?: any;
                chosenRewards?: string[];
            }): Promise<{
                ok: boolean;
                reason: string;
                waitlisted?: undefined;
                position?: undefined;
                signupId?: undefined;
            } | {
                ok: boolean;
                waitlisted: boolean;
                position: number;
                signupId: any;
                reason?: undefined;
            } | {
                unlockInfo?: {
                    pointsPreview: {
                        base: number;
                        auth: number;
                        contact: number;
                        survey: number;
                        subscribe: number;
                        total: number;
                    };
                    loginAuth: boolean;
                    subscribed: boolean;
                    channelDone: boolean;
                    conditions: Record<string, boolean>;
                    chosenRewards: any[];
                };
                ok: boolean;
                granted: {
                    id: string;
                    type: string;
                    name: string;
                    message: string;
                    link?: string;
                }[];
                signupId: any;
                pointsPreview: {
                    base: number;
                    auth: number;
                    contact: number;
                    survey: number;
                    subscribe: number;
                    total: number;
                };
                reason?: undefined;
                waitlisted?: undefined;
                position?: undefined;
            }>;
            fillQuestionnaire({ userId, signupId, answers, type }: {
                userId: number;
                signupId: number;
                answers?: any;
                type?: "pre" | "post";
            }): Promise<{
                ok: boolean;
                type: string;
                postDone: boolean;
                unlockInfo?: undefined;
                newlyUnlocked?: undefined;
            } | {
                ok: boolean;
                unlockInfo: any;
                newlyUnlocked: any[];
                type?: undefined;
                postDone?: undefined;
            }>;
            fillContact({ userId, signupId, formData }: {
                userId: number;
                signupId: number;
                formData?: any;
            }): Promise<{
                ok: boolean;
                unlockInfo: any;
                newlyUnlocked: any[];
                newlyContact: boolean;
            }>;
            getFollowQrcode({ userId, activityId }: {
                userId: number;
                activityId: string;
            }): Promise<{
                ok: boolean;
                wx_url: any;
            }>;
            claimSubscribe({ userId, signupId }: {
                userId: number;
                signupId: number;
            }): Promise<{
                ok: boolean;
                subscribed: boolean;
                newlyUnlocked: any[];
                unlockInfo?: undefined;
            } | {
                ok: boolean;
                subscribed: boolean;
                unlockInfo: any;
                newlyUnlocked: any[];
            }>;
            signupUnlockStatus({ userId, signupId }: {
                userId: number;
                signupId: number;
            }): Promise<{
                ok: boolean;
                hasReward: boolean;
                loginAuth: boolean;
                subscribed: boolean;
                contactDone: boolean;
                surveyDone: boolean;
                formData: any;
                questionnaireData: any;
                preQuestionnaireData: any;
                postSurveyAllowed: boolean;
                pointsPreview: {
                    base: number;
                    auth: number;
                    contact: number;
                    survey: number;
                    subscribe: number;
                    total: number;
                };
                channel?: undefined;
                channelDone?: undefined;
                rewards?: undefined;
            } | {
                ok: boolean;
                hasReward: boolean;
                loginAuth: boolean;
                subscribed: boolean;
                channel: {
                    type: string;
                    label?: string;
                };
                channelDone: boolean;
                contactDone: boolean;
                surveyDone: boolean;
                formData: any;
                questionnaireData: any;
                preQuestionnaireData: any;
                postSurveyAllowed: boolean;
                rewards: any;
                pointsPreview: {
                    base: number;
                    auth: number;
                    contact: number;
                    survey: number;
                    subscribe: number;
                    total: number;
                };
            }>;
            unlockCheck({ userId, activityDocumentId, formData, preQuestionnaireData }: {
                userId: number;
                activityDocumentId: string;
                formData?: any;
                preQuestionnaireData?: any;
            }): Promise<{
                ok: boolean;
                hasReward: boolean;
                loginAuth: boolean;
                subscribed: boolean;
                conditions: {
                    contact: boolean;
                    survey: boolean;
                    post_survey: boolean;
                };
                pointsPreview: {
                    base: number;
                    auth: number;
                    contact: number;
                    survey: number;
                    subscribe: number;
                    total: number;
                };
                channel?: undefined;
                channelDone?: undefined;
                selectMode?: undefined;
                selectN?: undefined;
                rewards?: undefined;
            } | {
                ok: boolean;
                hasReward: boolean;
                loginAuth: boolean;
                subscribed: boolean;
                channel: {
                    type: string;
                    label?: string;
                };
                conditions: {
                    contact: boolean;
                    survey: boolean;
                    post_survey: boolean;
                };
                channelDone: boolean;
                selectMode: any;
                selectN: number;
                rewards: any[];
                pointsPreview: {
                    base: number;
                    auth: number;
                    contact: number;
                    survey: number;
                    subscribe: number;
                    total: number;
                };
            }>;
            promoDetail({ activityDocumentId, userId, siteDocumentId }: {
                activityDocumentId: string;
                userId?: number;
                siteDocumentId?: string;
            }): Promise<{
                activity: import('@strapi/types/dist/modules/documents').AnyDocument;
                modules: any[];
                contact: any;
                rewards: any;
                signupStatus: any;
            }>;
            sendMessage({ userId, activityDocumentId, content }: {
                userId: number;
                activityDocumentId: string;
                content?: string;
            }): Promise<{
                documentId: string;
                status: any;
                createdAt: any;
            }>;
            listMyMessages({ userId, activityDocumentId }: {
                userId: number;
                activityDocumentId: string;
            }): Promise<{
                documentId: any;
                content: any;
                reply: any;
                status: any;
                repliedAt: any;
                createdAt: any;
            }[]>;
            adminListMessages({ activity, status, page, pageSize }: {
                activity?: string;
                status?: string;
                page: number;
                pageSize: number;
            }): Promise<{
                list: {
                    documentId: any;
                    content: any;
                    reply: any;
                    status: any;
                    repliedAt: any;
                    createdAt: any;
                    user: {
                        id: any;
                        documentId: any;
                        username: any;
                        nickname: any;
                        avatar: any;
                        phone: any;
                    };
                    activity: {
                        documentId: any;
                        title: any;
                    };
                }[];
                pagination: {
                    page: number;
                    pageSize: number;
                    pageCount: number;
                    total: number;
                };
            }>;
            adminReplyMessage({ messageDocumentId, reply }: {
                messageDocumentId: string;
                reply?: string;
            }): Promise<{
                documentId: string;
                status: any;
                repliedAt: any;
            }>;
            listPublicReviews({ activityDocumentId, page, pageSize }: {
                activityDocumentId: string;
                page?: number;
                pageSize?: number;
            }): Promise<{
                rows: {
                    id: any;
                    rating: any;
                    nps: any;
                    review: any;
                    reviewedAt: any;
                    user: {
                        id: any;
                        username: any;
                        nickname: any;
                        avatar: any;
                    };
                }[];
                summary: {
                    count: number;
                    avgRating: number;
                    avgNps: number;
                    reviewCount: number;
                };
                pagination: {
                    page: number;
                    pageSize: number;
                    pageCount: number;
                    total: number;
                };
            }>;
            isLessonTempAuthorized({ userId, lessonDocumentId }: {
                userId: number;
                lessonDocumentId: string;
            }): Promise<{
                authorized: boolean;
                reason: string;
                auth?: undefined;
            } | {
                authorized: boolean;
                auth: any;
                reason?: undefined;
            }>;
            adminGrantTempLesson(opts: {
                activityId: string;
                userId: number;
                lessonDocumentId: string;
                source?: "signup" | "milestone" | "manual";
                expiresAt?: string | Date | null;
            }): Promise<{
                ok: boolean;
                expiresAt: any;
            }>;
            getLearningContent({ userId, activityDocumentId }: {
                userId: number;
                activityDocumentId: string;
            }): Promise<{
                checkedIn: boolean;
                articles: {
                    documentId: any;
                    title: any;
                    url: any;
                }[];
                lessons: {
                    documentId: any;
                    title: any;
                    course: {
                        documentId: any;
                        title: any;
                    };
                }[];
                courses: any[];
            }>;
            closeActivity(activityId: string): Promise<{
                ok: boolean;
                closed: boolean;
                already: boolean;
                reviewTriggered: number;
                revisitTriggered: number;
                repurchaseTriggered: number;
            } | {
                ok: boolean;
                closed: boolean;
                reviewTriggered: number;
                revisitTriggered: number;
                repurchaseTriggered: number;
                already?: undefined;
            }>;
            ensureTransitions(activityDocumentId: string): Promise<boolean>;
            drainDueActivities(): Promise<{
                scanned: number;
                moved: number;
            }>;
            adminArchive(activityDocumentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            adminUnarchive(activityDocumentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            cancel({ userId, activityId }: {
                userId: number;
                activityId: number;
            }): Promise<{
                ok: boolean;
            }>;
            promoteWaiting(activityId: number): Promise<{
                promoted: number;
            }>;
            waitlistPositionOf(activityId: number, signup: {
                id: number;
                signupAt: Date | string;
            }): Promise<number>;
            notifyPromoted(upUserId: number, activityId: number): Promise<void>;
            notifyInApp(upUserId: number, activityId: number, scene: string, params: Record<string, any>, dedupeKey: string): Promise<void>;
            checkin({ userId, activityId, method, lat, lng }: {
                userId: number;
                activityId: string;
                method: "worker_scan" | "self";
                lat?: number;
                lng?: number;
            }): Promise<{
                ok: boolean;
                reason: string;
                attendanceId: any;
                point: any;
            } | {
                ok: boolean;
                reason: string;
                attendanceId?: undefined;
                point?: undefined;
            } | {
                ok: boolean;
                attendanceId: any;
                point: boolean;
                reason?: undefined;
            }>;
        };
        "series-service": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            find(params: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
            findOne(documentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            create(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            update(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            delete(documentId: string): Promise<{
                documentId: import('@strapi/types/dist/modules/documents').ID;
                entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
            }>;
            listActivities(seriesDocumentId: string): Promise<any[]>;
            duplicate(activityDocumentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            generateSchedule(seriesDocumentId: string, { count }?: {
                count?: number;
            }): Promise<{
                generated: number;
                reason: string;
            } | {
                generated: number;
                reason?: undefined;
            }>;
        };
        "calendar-service": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            getCalendarMonth({ month, includeAllStatus }?: {
                month?: string;
                includeAllStatus?: boolean;
            }): Promise<{
                days: {
                    date: string;
                    activities: any[];
                }[];
            }>;
        };
        "fee-service": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            resolveUserProfile(upUserId: number): Promise<{
                segment: string;
                isPartner: boolean;
            }>;
            tierUsage(activityId: number, tierId: string): Promise<number>;
            resolveFee(activity: any, upUserId: number, opts?: {
                now?: string;
                excludeTierId?: string;
            }): Promise<{
                mode: string;
                cost: number;
                feeCollectAt: any;
                tierId: any;
                tier: any;
                base?: undefined;
            } | {
                mode: string;
                cost: number;
                feeCollectAt: any;
                tierId: any;
                tier: any;
                base: any;
            }>;
        };
        "activity-stats": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            getOverview({ status }?: {
                status?: string;
            }): Promise<{
                summary: {
                    activityCount: number;
                    signupCount: number;
                    attendedCount: number;
                    attendanceRate: number;
                    reviewCount: number;
                    avgRating: number;
                    avgNps: number;
                    pointsChargedSum: any;
                    referralPoints: any;
                    referralCount: number;
                    attendPointsGlobal: any;
                };
                rows: any[];
            }>;
        };
        form: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            validateFormData: typeof import('./services/form').validateFormData;
            collectFormData: typeof import('./services/form').collectFormData;
            channelFilled: typeof import('./services/form').channelFilled;
            collectQuestionnaire: typeof import('./services/form').collectQuestionnaire;
        };
        "resource-schedule": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            LECTURER_UID: string;
            VENUE_UID: string;
            check(opts: {
                start: Date | string;
                end: Date | string;
                excludeActivityId?: number;
                lecturerId?: number;
                venueId?: number;
            }): Promise<{
                ok: boolean;
                conflicts: any[];
            } | {
                ok: boolean;
                conflicts?: undefined;
            }>;
            suggest(opts: {
                type: "lecturer" | "venue";
                resourceId: number;
                start: Date | string;
                end: Date | string;
                n?: number;
                excludeActivityId?: number;
            }): Promise<any[]>;
        };
        "activity-ledger": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            generate(activityId: string, source?: "auto" | "manual"): Promise<any>;
            list(params?: {
                activityDocumentId?: string;
                page?: number;
                pageSize?: number;
            }): Promise<{
                list: any[];
                pagination: {
                    page: number;
                    pageSize: number;
                    pageCount: number;
                    total: number;
                };
            }>;
            regenerate(activityId: string): Promise<any>;
            generateAutoIfAbsent(activityId: string): Promise<any>;
            settle(ledgerDocumentId: string, body?: {
                settleStatus?: string;
            }): Promise<any>;
        };
    };
    routes: {
        "content-api": {
            type: "content-api";
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
