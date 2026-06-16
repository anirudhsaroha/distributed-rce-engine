const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const { initMongo } = require('./src/db/mongo');
const { initPostgres } = require('./src/db/postgres');
const { createRedisClient } = require('./src/db/redis');
const { submitQueue } = require('./src/queues/submitQueue');
const routes = require('./src/routes');
const { initSockets } = require('./src/sockets');

dotenv.config();

const app = express();
const server = http.createServer(app);

// middlewares
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// health
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'api-gateway' }));

// API routes
app.use('/api', routes);

// global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // initialize databases and redis
    await initMongo(process.env.MONGO_URL);
    await initPostgres();
    const redis = createRedisClient();

    // initialize queue (submitQueue already configured to use Redis client)
    await submitQueue.onReady();

    // initialize sockets
    initSockets(server, submitQueue);

    server.listen(PORT, () => {
      console.log(`API Gateway listening on port ${PORT}`);
    });

    // graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down...');
      try {
        await submitQueue.close();
        if (redis) await redis.disconnect();
        process.exit(0);
      } catch (e) {
        console.error('Error during shutdown', e);
        process.exit(1);
      }
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();
