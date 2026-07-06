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
        wechatRedirect(ctx: any): Promise<void>;
        wechatCallback(ctx: any): Promise<void>;
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
        listChannels(ctx: any): Promise<void>;
        createChannel(ctx: any): Promise<void>;
        updateChannel(ctx: any): Promise<void>;
        listLoginLogs(ctx: any): Promise<void>;
        channelReport(ctx: any): Promise<void>;
    };
};
export default _default;
