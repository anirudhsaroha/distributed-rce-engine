const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({ input: String, output: String, hidden: { type: Boolean, default: true } });

const problemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  statement: { type: String },
  timeLimitMs: { type: Number, default: 1000 },
  memoryLimitKb: { type: Number, default: 65536 },
  testCases: [testCaseSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Problem', problemSchema);
