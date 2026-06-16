const express = require('express');
const { auth } = require('../middleware/auth');
const controller = require('../controllers/submissionController');
const router = express.Router();

router.post('/:problemSlug', auth(), controller.createSubmission);
router.get('/:id', auth(false), controller.getSubmission);
router.get('/', auth(), controller.listUserSubmissions);

module.exports = router;
