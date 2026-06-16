const Submission = require('../models/submission');
const Problem = require('../models/problem');
const { submitQueue } = require('../queues/submitQueue');

async function createSubmission(req, res, next) {
  try {
    const { problemSlug } = req.params;
    const { language, code } = req.body;
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'unauthenticated' });
    const problem = await Problem.findOne({ slug: problemSlug });
    if (!problem) return res.status(404).json({ error: 'problem not found' });

    const submission = await Submission.create({ userId, problemId: problem._id, language, code, status: 'queued' });

    // enqueue job for worker
    await submitQueue.add('run', { submissionId: submission._id.toString(), problemId: problem._id.toString(), language, code });

    res.status(201).json({ id: submission._id, status: submission.status });
  } catch (err) { next(err); }
}

async function getSubmission(req, res, next) {
  try {
    const { id } = req.params;
    const sub = await Submission.findById(id);
    if (!sub) return res.status(404).json({ error: 'not found' });
    res.json(sub);
  } catch (err) { next(err); }
}

async function listUserSubmissions(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'unauthenticated' });
    const subs = await Submission.find({ userId }).sort({ createdAt: -1 }).limit(50);
    res.json(subs);
  } catch (err) { next(err); }
}

module.exports = { createSubmission, getSubmission, listUserSubmissions };
