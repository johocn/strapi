declare const mockDbQuery: jest.Mock<any, any, any>;
declare const mockStrapi: {
    db: {
        query: jest.Mock<any, any, any>;
    };
    log: {
        info: jest.Mock<any, any, any>;
        warn: jest.Mock<any, any, any>;
        error: jest.Mock<any, any, any>;
    };
    plugin: jest.Mock<any, any, any>;
    service: jest.Mock<any, any, any>;
};
export { mockStrapi, mockDbQuery };
