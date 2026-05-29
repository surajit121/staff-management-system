import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;
let redis = null;

if (redisUrl) {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
  });
  redis.on('error', (err) => console.error('Redis Error:', err));
  redis.on('connect', () => console.log('✅ Redis Connected'));
}

export const cacheMiddleware = (duration = 60) => async (req, res, next) => {
  if (!redis) return next();

  const key = `cache:${req.originalUrl || req.url}`;
  
  try {
    const cachedResponse = await redis.get(key);
    if (cachedResponse) {
      return res.json(JSON.parse(cachedResponse));
    }

    // Override res.json to capture response
    const originalJson = res.json;
    res.json = (body) => {
      redis.set(key, JSON.stringify(body), 'EX', duration);
      return originalJson.call(res, body);
    };

    next();
  } catch (error) {
    console.error('Cache Middleware Error:', error);
    next();
  }
};

export const clearCache = async (pattern) => {
  if (!redis) return;
  const stream = redis.scanStream({
    match: `cache:${pattern}*`,
    count: 100,
  });

  stream.on('data', async (keys) => {
    if (keys.length > 0) {
      try {
        await redis.del(keys);
      } catch (err) {
        console.error('Failed to delete cache keys during invalidation:', err);
      }
    }
  });

  stream.on('error', (err) => {
    console.error('Redis scanStream Error during cache clearing:', err);
  });
};

export default redis;
