const Problem = require('../models/problem');

async function listProblems(req, res, next) {
  try {
    const problems = await Problem.find({}, 'title slug createdAt');
    res.json(problems);
  } catch (err) { next(err); }
}

async function getProblem(req, res, next) {
  try {
    const { slug } = req.params;
    const problem = await Problem.findOne({ slug });
    if (!problem) return res.status(404).json({ error: 'not found' });
    res.json(problem);
  } catch (err) { next(err); }
}

async function createProblem(req, res, next) {
  try {
    const payload = req.body;
    // basic validation
    if (!payload.title || !payload.slug) return res.status(400).json({ error: 'title and slug required' });
    const p = await Problem.create(payload);
    res.status(201).json(p);
  } catch (err) { next(err); }
}

async function updateProblem(req, res, next) {
  try {
    const { slug } = req.params;
    const updated = await Problem.findOneAndUpdate({ slug }, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'not found' });
    res.json(updated);
  } catch (err) { next(err); }
}

async function deleteProblem(req, res, next) {
  try {
    const { slug } = req.params;
    const removed = await Problem.findOneAndDelete({ slug });
    if (!removed) return res.status(404).json({ error: 'not found' });
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { listProblems, getProblem, createProblem, updateProblem, deleteProblem };
