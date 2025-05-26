const express = require("express");
const router = express.Router();
const whatsapp = require("../whatsappClient");

// POST /logout
router.post("/logout", async (req, res) => {
  const { sessionId } = req.body;
  try {
    await whatsapp.logoutAndCleanup(sessionId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;