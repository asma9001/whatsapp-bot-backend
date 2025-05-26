const express = require("express");
const router = express.Router();
const multer = require("multer");
const campaignController = require("../controllers/campaignController");

const path = require("path");
const { sendCampaignMessage } = require("../controllers/campaignController");

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

router.post("/send", upload.single("image"), sendCampaignMessage);

const csvUpload = multer({ dest: "uploads/" });
router.post(
  "/send-csv-messages",
  csvUpload.single("file"), // handle file upload with multer
  campaignController.sendCsvMessagesToGroup
);
// routes/campaignRoutes.js
router.put("/campaigns/:id/status", campaignController.toggleCampaignStatus);

// router.post(
//   "/campaigns",
//   upload.single("media"),
//   campaignController.createCampaign
// );
router.get("/getCampaigns", campaignController.getAllCampaigns);
module.exports = router;
