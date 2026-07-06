export declare const normalizeRecord: <T extends {
    documentId?: string;
    id?: string;
}>(record: T) => T & {
    id: string;
};
export declare const normalizeList: <T extends {
    documentId?: string;
    id?: string;
}>(list?: T[]) => (T & {
    id: string;
})[];
//# sourceMappingURL=fieldNormalizer.d.ts.map