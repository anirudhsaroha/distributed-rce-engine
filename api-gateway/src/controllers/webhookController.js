// optional: endpoints for worker callbacks (if workers call back instead of queue events)
const Submission = require('../models/submission');
const { notifySubmission } = require('../services/notify');

async function workerCallback(req, res, next) {
  try {
    const { submissionId, status, result } = req.body;
    if (!submissionId) return res.status(400).json({ error: 'submissionId required' });
    const sub = await Submission.findByIdAndUpdate(submissionId, { status, result, updatedAt: new Date() }, { new: true });
    if (!sub) return res.status(404).json({ error: 'not found' });
    notifySubmission(submissionId, { status, result });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

module.exports = { workerCallback };
