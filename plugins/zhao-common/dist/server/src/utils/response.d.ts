/**
 * Strapi v5 标准 content-api 响应包装工具
 *
 * 单条: { data, meta }
 * 列表: { data, meta: { pagination } }
 */
/** 包装单条数据 */
export declare function wrap(data: any, meta?: any): {
    data: any;
    meta: any;
};
/** 包装列表数据，自动提取 results/pagination */
export declare function wrapList(result: any): {
    data: any;
    meta: {
        pagination: any;
    };
} | {
    data: any;
    meta: {
        pagination?: undefined;
    };
};
