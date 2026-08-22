declare const _default: {
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
    activity: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        list(ctx: any): Promise<void>;
        detail(ctx: any): Promise<void>;
        signup(ctx: any): Promise<void>;
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
export default _default;
