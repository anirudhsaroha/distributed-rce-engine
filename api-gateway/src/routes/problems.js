const express = require('express');
const { auth } = require('../middleware/auth');
const controller = require('../controllers/problemController');
const router = express.Router();

router.get('/', controller.listProblems);
router.get('/:slug', controller.getProblem);

// admin routes
router.post('/', auth(), controller.createProblem);
router.put('/:slug', auth(), controller.updateProblem);
router.delete('/:slug', auth(), controller.deleteProblem);

module.exports = router;
