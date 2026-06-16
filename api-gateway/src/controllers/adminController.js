const { getPool } = require('../db/postgres');
const { submitQueue } = require('../queues/submitQueue');
const { publishAdmin } = require('../sockets');

// simple in-memory recent completed jobs
let recentCompleted = [];

async function status(req, res, next) {
  try {
    // workers: we don't have explicit worker registry; get basic info from BullMQ queue
    const queue = submitQueue;
    const jobCounts = await queue.getJobCounts();
    const waiting = jobCounts.waiting || jobCounts.waiting || 0;

    // running jobs can be fetched via active()
    const active = await queue.getJobs(['active'], 0, 100);
    const activeJobs = (active || []).map((j) => ({ id: j.id, submissionId: j.data.submissionId, language: j.data.language }));

    const completed = recentCompleted.slice(0, 100);

    // metrics placeholder
    const metrics = { cpu: 0, memory: 0, latencyMs: 0 };

    res.json({ workers: [], queueDepth: waiting, runningJobs: activeJobs, completedJobs: completed, metrics });
  } catch (err) { next(err); }
}

function recordCompleted(jobMeta) {
  recentCompleted.unshift(jobMeta);
  if (recentCompleted.length > 500) recentCompleted.pop();
  publishAdmin('admin.completedJobs', [jobMeta]);
}

module.exports = { status, recordCompleted };
