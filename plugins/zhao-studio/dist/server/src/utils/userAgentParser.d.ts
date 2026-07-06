export interface UserAgentInfo {
    browser: string;
    browserVersion: string;
    os: string;
    osVersion: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
    platform: string;
}
export declare function parseUserAgent(userAgent: string): UserAgentInfo;
//# sourceMappingURL=userAgentParser.d.ts.map