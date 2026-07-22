type Method = "GET" | "POST" | "PUT" | "DELETE";
declare const _default: () => {
    type: "content-api";
    routes: {
        method: Method;
        path: string;
        handler: string;
        config: {
            auth: boolean;
        };
    }[];
};
export default _default;
