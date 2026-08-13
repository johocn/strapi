declare const _default: () => {
    type: "content-api";
    routes: ({
        method: string;
        path: string;
        handler: string;
        config: {
            auth: boolean;
            policies: string[];
        };
    } | {
        method: string;
        path: string;
        handler: string;
        config: {
            auth: boolean;
            policies?: undefined;
        };
    })[];
};
export default _default;
