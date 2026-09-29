/** JSON 稳定序列化：对象键排序，保证键序不同不误判为差异 */
export declare function stableJson(v: any): string;
/** 字段级 diff：只返回真正发生变化的字段 { 字段: { before, after } } */
export declare function diffFields(before: any, after: any): Record<string, {
    before: any;
    after: any;
}>;
