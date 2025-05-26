const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardControllers");

router.get("/totalCampaign", dashboardController.getTotalCampaigns);
router.get("/sent-message", dashboardController.getMessagesSent);
router.get("/failed-message", dashboardController.getFailedMessages);
router.get("/queue-message", dashboardController.getQueuedMessages);
router.get("/recent-compaigns", dashboardController.getRecentCampaigns);
router.get("/upcoming-messages", dashboardController.getUpcomingMessages);
router.get("/sent-messages", dashboardController.getSentMessages);
module.exports = router;
