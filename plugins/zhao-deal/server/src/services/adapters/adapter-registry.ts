import type { PlatformAdapter } from "./platform-adapter";

export class AdapterRegistry {
  private adapters = new Map<string, PlatformAdapter>();

  register(adapter: PlatformAdapter): void {
    this.adapters.set(adapter.platformCode, adapter);
  }

  get(platformCode: string): PlatformAdapter {
    const adapter = this.adapters.get(platformCode);
    if (!adapter) {
      const err: any = new Error(`Platform adapter not found: ${platformCode}`);
      err.code = "DEAL_ADAPTER_NOT_FOUND";
      throw err;
    }
    return adapter;
  }

  has(platformCode: string): boolean {
    return this.adapters.has(platformCode);
  }

  list(): string[] {
    return Array.from(this.adapters.keys());
  }
}
