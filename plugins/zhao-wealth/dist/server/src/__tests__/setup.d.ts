declare const mockDbQuery: any;
declare const mockStrapi: {
    db: {
        query: any;
    };
    log: {
        info: any;
        warn: any;
        error: any;
    };
    plugin: any;
    service: any;
};
export { mockStrapi, mockDbQuery };
