const { publishSubmissionUpdate } = require('../sockets');

function notifySubmission(submissionId, payload) {
  // simple wrapper for now
  publishSubmissionUpdate(submissionId, payload);
}

module.exports = { notifySubmission };
