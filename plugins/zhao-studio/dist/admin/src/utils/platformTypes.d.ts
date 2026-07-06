export interface PlatformType {
    type: string;
    displayName: string;
    maxTitleLength: number;
    maxContentLength: number;
    supportsImage: boolean;
    supportsVideo: boolean;
    requiresCover: boolean;
}
export declare const platformTypes: Record<string, PlatformType>;
export declare function getPlatformType(type: string): PlatformType | undefined;
export declare function getAllPlatformTypes(): PlatformType[];
//# sourceMappingURL=platformTypes.d.ts.map