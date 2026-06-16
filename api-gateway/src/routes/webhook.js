const express = require('express');
const { workerCallback } = require('../controllers/webhookController');
const router = express.Router();

router.post('/worker', workerCallback);

module.exports = router;
