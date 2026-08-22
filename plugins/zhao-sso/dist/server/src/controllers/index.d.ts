declare const _default: {
    "auth-controller": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        login(ctx: any): Promise<void>;
        sendSms(ctx: any): Promise<void>;
        register(ctx: any): Promise<void>;
        verify(ctx: any): Promise<void>;
        refresh(ctx: any): Promise<void>;
        logout(ctx: any): Promise<void>;
    };
    "oauth-controller": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        authorize(ctx: any): Promise<void>;
        token(ctx: any): Promise<void>;
        exchangeToken(ctx: any): Promise<void>;
        wechatRedirect(ctx: any): Promise<void>;
        wechatCallback(ctx: any): Promise<void>;
        passwordAuthorize(ctx: any): Promise<void>;
        wechatMiniProgramLogin(ctx: any): Promise<void>;
        wechatAppLogin(ctx: any): Promise<void>;
        jssdkSignature(ctx: any): Promise<void>;
        wechatConfig(ctx: any): Promise<void>;
        alipayRedirect(ctx: any): Promise<void>;
        alipayCallback(ctx: any): Promise<void>;
    };
    "user-controller": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        me(ctx: any): Promise<void>;
        bind(ctx: any): Promise<void>;
        unbind(ctx: any): Promise<void>;
        changePassword(ctx: any): Promise<void>;
    };
    "channel-controller": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        track(ctx: any): Promise<void>;
    };
    "admin-controller": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        dashboard(ctx: any): Promise<void>;
        listUsers(ctx: any): Promise<void>;
        getUser(ctx: any): Promise<void>;
        updateUser(ctx: any): Promise<void>;
        listApps(ctx: any): Promise<void>;
        createApp(ctx: any): Promise<void>;
        updateApp(ctx: any): Promise<void>;
        getApp(ctx: any): Promise<void>;
        deleteApp(ctx: any): Promise<void>;
        listChannels(ctx: any): Promise<void>;
        createChannel(ctx: any): Promise<void>;
        updateChannel(ctx: any): Promise<void>;
        listLoginLogs(ctx: any): Promise<void>;
        channelReport(ctx: any): Promise<void>;
    };
    token: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        list(ctx: any): Promise<void>;
        findOne(ctx: any): Promise<void>;
        delete(ctx: any): Promise<void>;
    };
    "auth-code": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        list(ctx: any): Promise<void>;
        findOne(ctx: any): Promise<void>;
        delete(ctx: any): Promise<void>;
    };
    binding: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        list(ctx: any): Promise<void>;
        findOne(ctx: any): Promise<void>;
        create(ctx: any): Promise<void>;
        update(ctx: any): Promise<void>;
        delete(ctx: any): Promise<void>;
    };
    "oauth-config": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        list(ctx: any): Promise<void>;
        findOne(ctx: any): Promise<void>;
        create(ctx: any): Promise<void>;
        update(ctx: any): Promise<void>;
        delete(ctx: any): Promise<void>;
    };
    role: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        list(ctx: any): Promise<void>;
        findOne(ctx: any): Promise<void>;
        create(ctx: any): Promise<void>;
        update(ctx: any): Promise<void>;
        delete(ctx: any): Promise<void>;
    };
    "invite-code": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        list(ctx: any): Promise<void>;
        create(ctx: any): Promise<void>;
        delete(ctx: any): Promise<void>;
        validate(ctx: any): Promise<void>;
    };
    "invite-usage": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        list(ctx: any): Promise<void>;
        delete(ctx: any): Promise<void>;
    };
    referral: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        list(ctx: any): Promise<void>;
        delete(ctx: any): Promise<void>;
    };
    "sms-code": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        list(ctx: any): Promise<void>;
        delete(ctx: any): Promise<void>;
    };
    message: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        listTemplates(ctx: any): Promise<void>;
        getTemplate(ctx: any): Promise<void>;
        createTemplate(ctx: any): Promise<void>;
        updateTemplate(ctx: any): Promise<void>;
        deleteTemplate(ctx: any): Promise<void>;
        listJobs(ctx: any): Promise<void>;
        getJob(ctx: any): Promise<void>;
        sendNow(ctx: any): Promise<void>;
        sendBatch(ctx: any): Promise<void>;
        retryJob(ctx: any): Promise<void>;
        refreshSubscribe(ctx: any): Promise<void>;
    };
    sop: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        list(ctx: any): Promise<void>;
        create(ctx: any): Promise<void>;
        update(ctx: any): Promise<void>;
        delete(ctx: any): Promise<void>;
    };
    profile: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        list(ctx: any): Promise<void>;
        detail(ctx: any): Promise<void>;
        recalcAll(ctx: any): Promise<void>;
    };
    partner: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        myCustomers(ctx: any): Promise<void>;
        customerDetail(ctx: any): Promise<void>;
        touch(ctx: any): Promise<void>;
        listFollowUps(ctx: any): Promise<void>;
        createFollowUp(ctx: any): Promise<void>;
        updateFollowUp(ctx: any): Promise<void>;
    };
    "msg-version": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        list(ctx: any): Promise<void>;
        create(ctx: any): Promise<void>;
        update(ctx: any): Promise<void>;
        delete(ctx: any): Promise<void>;
        activate(ctx: any): Promise<void>;
        abStats(ctx: any): Promise<void>;
    };
    "recommend-controller": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        my(ctx: any): Promise<{
            error: string;
        }>;
    };
    "notice-controller": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        myNotices(ctx: any): Promise<void>;
        read(ctx: any): Promise<void>;
    };
    "msg-stats": ({ strapi }: any) => {
        sopStats(ctx: any): Promise<void>;
        repurchaseStats(ctx: any): Promise<void>;
        courseD7Stats(ctx: any): Promise<void>;
        courseCompletionStats(ctx: any): Promise<void>;
    };
};
export default _default;
