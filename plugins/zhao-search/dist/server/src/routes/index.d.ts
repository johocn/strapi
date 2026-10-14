declare const _default: {
    "admin-api": () => {
        type: "admin";
        prefix: string;
        routes: {
            method: string;
            path: string;
            handler: string;
            config: {
                auth: boolean;
                policies: any[];
            };
        }[];
    };
};
export default _default;
