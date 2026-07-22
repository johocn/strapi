import { PlatformAdapter } from './platform-adapter';
export declare class AdapterRegistry {
    private adapters;
    register(adapter: PlatformAdapter): void;
    get(platformCode: string): PlatformAdapter;
    has(platformCode: string): boolean;
    list(): string[];
}
