const express = require('express');
const authRoutes = require('./auth');
const problemRoutes = require('./problems');
const submissionRoutes = require('./submissions');
const webhookRoutes = require('./webhook');
const adminRoutes = require('./admin');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/problems', problemRoutes);
router.use('/submissions', submissionRoutes);
router.use('/webhook', webhookRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
