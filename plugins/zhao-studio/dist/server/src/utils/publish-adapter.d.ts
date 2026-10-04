export declare function detectContentType(content: any): 'article' | 'video' | 'gallery';
export declare function validateContentForPlatform(content: any, contentType: 'article' | 'video' | 'gallery', platformType: string): {
    valid: boolean;
    errors: string[];
};
export declare function getContentUid(type: 'article' | 'video' | 'gallery'): string;
//# sourceMappingURL=publish-adapter.d.ts.map