console.log("worker started");
console.log(`redis: ${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`);

// Worker: BullMQ consumer that runs code inside Docker containers with strict sandboxing
const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const Docker = require('dockerode');
const tar = require('tar-stream');
const stream = require('stream');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const redisConnection = { host: process.env.REDIS_HOST || '127.0.0.1', port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379 };
const docker = new Docker();

function createTarStream(filename, content) {
  const pack = tar.pack();
  pack.entry({ name: filename, mode: 0o644 }, content);
  pack.finalize();
  return pack;
}

async function execInContainer(container, cmd, opts = {}) {
  const { timeoutMs = 5000 } = opts;
  const exec = await container.exec({ Cmd: ['sh', '-lc', cmd], AttachStdout: true, AttachStderr: true, WorkingDir: '/workspace' });

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let finished = false;

    const timer = setTimeout(async () => {
      if (finished) return;
      finished = true;
      try {
        await container.kill().catch(() => {});
      } catch (e) {}
      reject(new Error('TIMEOUT'));
    }, timeoutMs);

    exec.start(async (err, stream) => {
      if (err) {
        clearTimeout(timer);
        return reject(err);
      }

      // Docker multiplexes stdout/stderr when stream is in multiplexed mode; simple approach: collect both
      stream.on('data', (chunk) => {
        const s = chunk.toString('utf8');
        stdout += s;
      });

      stream.on('end', async () => {
        clearTimeout(timer);
        try {
          const info = await exec.inspect();
          finished = true;
          resolve({ exitCode: info.ExitCode, stdout, stderr });
        } catch (e) {
          reject(e);
        }
      });

      stream.on('error', (e) => {
        clearTimeout(timer);
        if (!finished) {
          finished = true;
          reject(e);
        }
      });
    });
  });
}

function mapLanguage(language) {
  const lang = (language || '').toLowerCase();
  if (lang === 'c') return { filename: 'main.c', compile: 'gcc main.c -O2 -o main', run: './main' };
  if (lang === 'cpp' || lang === 'c++') return { filename: 'main.cpp', compile: 'g++ main.cpp -O2 -std=c++17 -o main', run: './main' };
  if (lang === 'python' || lang === 'py') return { filename: 'main.py', compile: null, run: 'python3 main.py' };
  if (lang === 'javascript' || lang === 'node') return { filename: 'main.js', compile: null, run: 'node main.js' };
  if (lang === 'java') return { filename: 'Main.java', compile: 'javac Main.java', run: 'java -cp . Main' };
  return null;
}

async function handleJob(job) {
  const { submissionId, problemId, language, code } = job.data;
  console.log('Processing job', job.id, submissionId, language);

  const metaId = uuidv4();
  const mapping = mapLanguage(language);
  if (!mapping) {
    return { verdict: 'internal_error', message: 'unsupported language' };
  }

  const image = process.env.SANDBOX_IMAGE || 'rce-sandbox:latest';
  const memoryLimit = (process.env.SANDBOX_MEMORY_MB ? Number(process.env.SANDBOX_MEMORY_MB) : 512) * 1024 * 1024; // default 512MB
  const timeLimitMs = process.env.SANDBOX_TIME_LIMIT_MS ? Number(process.env.SANDBOX_TIME_LIMIT_MS) : 5000; // default 5s
  const nanoCpus = process.env.SANDBOX_NANO_CPUS ? Number(process.env.SANDBOX_NANO_CPUS) : 1_000_000_000; // 1 CPU

  let container;

  try {
    // create container with strict HostConfig: no network, memory, cpu, drop caps, no new privileges, auto remove
    container = await docker.createContainer({
      Image: image,
      Cmd: ['sh', '-c', 'while true; do sleep 1; done'],
      Tty: false,
      WorkingDir: '/workspace',
      HostConfig: {
        NetworkMode: 'none',
        AutoRemove: true,
        Memory: memoryLimit,
        NanoCpus: nanoCpus,
        PidsLimit: 64,
        CapDrop: ['ALL'],
        SecurityOpt: ['no-new-privileges'],
      },
      // run as non-root where possible
      User: process.env.SANDBOX_USER || 'nobody',
    });

    await container.start();

    // ensure workspace exists and copy source file to /workspace
    const filename = mapping.filename;
    const tarStream = createTarStream(filename, code || '');
    await container.putArchive(tarStream, { path: '/workspace' });

    // compile if needed
    if (mapping.compile) {
      try {
        const compileResult = await execInContainer(container, `cd /workspace && ${mapping.compile} 2>&1`, { timeoutMs: timeLimitMs });
        if (compileResult.exitCode !== 0) {
          return { verdict: 'compile_error', stdout: compileResult.stdout, stderr: compileResult.stderr };
        }
      } catch (e) {
        if (e.message === 'TIMEOUT') return { verdict: 'compile_time_limit_exceeded' };
        return { verdict: 'compile_error', message: e.message };
      }
    }

    // run program
    try {
      const runResult = await execInContainer(container, `cd /workspace && ${mapping.run} 2>&1`, { timeoutMs: timeLimitMs });
      if (runResult.exitCode === 0) {
        return { verdict: 'accepted', stdout: runResult.stdout, stderr: runResult.stderr, timeMs: 0 };
      }
      // non-zero exit code => runtime error
      return { verdict: 'runtime_error', exitCode: runResult.exitCode, stdout: runResult.stdout, stderr: runResult.stderr };
    } catch (e) {
      if (e.message === 'TIMEOUT') return { verdict: 'time_limit_exceeded' };
      return { verdict: 'runtime_error', message: e.message };
    }
  } catch (err) {
    console.error('Worker error', err);
    return { verdict: 'internal_error', message: String(err) };
  } finally {
    try {
      if (container) {
        // ensure container is removed; AutoRemove is enabled but attempt force removal to clean up if required
        await container.remove({ force: true }).catch(() => {});
      }
    } catch (e) {}
  }
}

// create BullMQ worker
const connection = new IORedis(redisConnection);

const worker = new Worker('submissions', async (job) => {
  // Emit job.started event
  const eventPayload = { submissionId: job.data.submissionId, jobId: job.id, status: 'started' };
  const callbackUrl = process.env.WORKER_CALLBACK_URL || process.env.API_GATEWAY_WEBHOOK || 'http://api-gateway:3000/api/webhook/worker';
  try {
    await axios.post(callbackUrl, { event: 'job.started', payload: eventPayload }).catch(() => {});
  } catch (e) {
    console.error('callback error', e.message);
  }

  const result = await handleJob(job);

  // Emit job.completed event
  try {
    await axios.post(callbackUrl, { event: 'job.completed', payload: { ...eventPayload, status: result.verdict, result } }).catch(() => {});
  } catch (e) {
    console.error('callback error', e.message);
  }

  return result;
}, { connection: redisConnection });

worker.on('completed', (job) => {
  console.log('Job completed', job.id);
});
worker.on('failed', (job, err) => {
  console.error('Job failed', job ? job.id : 'unknown', err);
});

console.log('Worker started, connected to Redis', redisConnection);
