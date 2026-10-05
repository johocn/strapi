// server/src/services/rpa/index.ts
// RPA 平台驱动注册表：platform → driver。

import xiaohongshu from './xiaohongshu';
import toutiao from './toutiao';
import bilibili from './bilibili';
import type { RpaDriver, RpaPlatform } from './types';

const DRIVERS: Record<RpaPlatform, RpaDriver> = { xiaohongshu, toutiao, bilibili };

export function getRpaDriver(platform: string): RpaDriver {
  const driver = DRIVERS[platform as RpaPlatform];
  if (!driver) {
    throw new Error(`平台 ${platform} 没有 RPA 驱动实现`);
  }
  return driver;
}

export { xiaohongshu, toutiao, bilibili };
export * from './types';