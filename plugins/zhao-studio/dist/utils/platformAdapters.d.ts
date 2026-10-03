export interface PlatformAdapter {
    type: string;
    displayName: string;
    maxTitleLength: number;
    maxContentLength: number;
    supportsImage: boolean;
    supportsVideo: boolean;
    requiresCover: boolean;
    endpointTemplate?: string;
}
export declare const platformAdapters: Record<string, PlatformAdapter>;
export declare function getPlatformAdapter(type: string): PlatformAdapter | undefined;
export declare function getAllPlatformAdapters(): PlatformAdapter[];
export declare function validateContentForPlatform(content: string, title: string, type: string): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=platformAdapters.d.ts.map