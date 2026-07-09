declare const _default: () => {
    type: "content-api";
    routes: {
        method: string;
        path: string;
        handler: string;
        config: {
            policies: string[];
        };
    }[];
};
export default _default;
