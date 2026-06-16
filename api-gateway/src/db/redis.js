const IORedis = require('ioredis');

function createRedisClient() {
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379;
  const client = new IORedis({ host, port });
  client.on('connect', () => console.log('Connected to Redis'));
  client.on('error', (err) => console.error('Redis error', err));
  return client;
}

module.exports = { createRedisClient };
