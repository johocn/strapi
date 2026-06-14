/**
 * 清除用户渠道缓存
 */
const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

async function clearUserChannelCache() {
  const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    console.log('Redis 连接成功');

    // 清除用户 shao (ID=2) 的渠道缓存
    const userId = 2;
    const key = `user:${userId}:allChannels`;
    
    const result = await redis.get(key);
    console.log(`\n缓存 key: ${key}`);
    console.log(`当前缓存值: ${result}`);
    
    // 删除缓存
    await redis.del(key);
    console.log(`已清除缓存`);

    // 验证
    const afterClear = await redis.get(key);
    console.log(`清除后缓存值: ${afterClear || 'null'}`);

    console.log('\n缓存清除完成，请重新登录获取新的 token');

  } catch (err) {
    console.error('Redis 操作失败:', err.message);
    console.log('\n注意: 如果 Redis 未运行，缓存不会被使用，问题可能在其他地方');
  } finally {
    await redis.quit();
  }
}

clearUserChannelCache();
