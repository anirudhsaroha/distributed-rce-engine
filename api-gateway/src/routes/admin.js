const express = require('express');
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');
const router = express.Router();

// for now require auth
router.get('/status', auth(), ctrl.status);

module.exports = router;
