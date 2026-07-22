type Method = "GET" | "POST" | "PUT" | "DELETE";
declare const _default: () => {
    type: "content-api";
    routes: {
        method: Method;
        path: string;
        handler: string;
        config: {
            auth: boolean;
            policies: (string | {
                name: string;
                config: {
                    action: string;
                };
            })[];
        };
    }[];
};
export default _default;
