const { Queue } = require('bullmq');
const { createRedisClient } = require('../db/redis');

const redisClient = createRedisClient();

const submitQueue = new Queue('submissions', { connection: { host: process.env.REDIS_HOST || '127.0.0.1', port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379 } });

// helper to wait until queue is ready
submitQueue.on('error', (err) => console.error('SubmitQueue error', err));

module.exports = { submitQueue };
