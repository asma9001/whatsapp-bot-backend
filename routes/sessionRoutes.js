const express = require('express');
const router = express.Router();
const { createClient } = require('../whatsappClient');

router.post('/start-session', (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ message: 'Session ID is required' });
  }
  createClient(sessionId);
  return res.json({ message: 'Session started', sessionId });
});

module.exports = router;