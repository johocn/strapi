export interface IpLocationInfo {
    country: string;
    city: string;
}
export declare function parseIpLocation(ip: string): Promise<IpLocationInfo>;
export declare function extractReferrerDomain(referrer: string): string;
//# sourceMappingURL=ipLocationParser.d.ts.map