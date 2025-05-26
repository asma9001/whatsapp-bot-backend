const Campaign = require("../models/Campaign");
const Message = require("../models/Message");
const {
  sendMessageToGroup,
  clientMap,
  createClient,
  downloadImageToUploads,
  
} = require("../whatsappClient");
const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");
const { MessageMedia } = require('whatsapp-web.js'); 
const formatDate = (date) => {
  if (!date) return null; // or return '' if you prefer

  const d = new Date(date);
  if (isNaN(d.getTime())) return null; // invalid date

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// ---------------- CREATE CAMPAIGN WITH MANUAL MESSAGE ----------------

exports.sendCampaignMessage = async (req, res) => {
  const { name, sessionId, groupId, caption, scheduledTime } = req.body;
  const file = req.file;

  if (!sessionId || !groupId || !scheduledTime) {
    return res.status(400).json({
      error: "Fields sessionId, groupId, and scheduledTime are required",
    });
  }

  try {
    const client = createClient(sessionId);

    // ✅ Get group name
    const groupChat = await client.getChatById(groupId);
    const groupName = groupChat?.name || "Unknown Group";

    const campaign = await Campaign.create({
      name,
      sessionId,
      groupId,
      groupName, // ✅ Save group name
      scheduledTime,
      messageInterval: 5000,
    });

    const imagePath = file
      ? path.join(__dirname, "..", "uploads", file.filename)
      : null;

    const now = new Date();
    const scheduledDate = new Date(scheduledTime);
    const isInPast = scheduledDate <= now;

    const messageObj = {
      campaignId: campaign._id,
      sessionId,
      groupId,
      groupName,
      content: caption || "",
      mediaUrl: imagePath,
      scheduledAt: scheduledTime,
      status: isInPast ? "sent" : "pending",
    };

    const savedMessage = await Message.create(messageObj);

    if (isInPast) {
      const messageToSend = imagePath
        ? {
            type: "image+caption",
            mediaUrl: imagePath,
            caption: caption || "",
          }
        : caption;

      await sendMessageToGroup(groupId, messageToSend, client);

      savedMessage.sentAt = new Date();
      savedMessage.status = "sent";
      await savedMessage.save();

      return res.status(200).json({
        success: true,
        message: "Message sent immediately and campaign logged.",
        campaignId: campaign._id,
      });
    } else {
      console.log("Message scheduled and saved to database.");
      return res.status(200).json({
        success: true,
        message: "Message scheduled and saved to database.",
        campaignId: campaign._id,
      });
    }
  } catch (error) {
    console.error("❌ Controller error:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ---------------- CSV MESSAGE SENDING ----------------
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

exports.sendCsvMessagesToGroup = async (req, res) => {
  try {
    const {
      sessionId,
      groupId,
      name,
      scheduledTime,
      messageInterval = 5000,
    } = req.body;

    if (!sessionId || !groupId) {
      return res
        .status(400)
        .json({ error: "sessionId and groupId are required" });
    }

    const client = clientMap[sessionId];
    if (!client) {
      return res
        .status(400)
        .json({ error: "WhatsApp client not initialized for this session" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "CSV file is required" });
    }

    // --- Fetch group name ---
    let groupName = groupId;
    try {
      const groupChat = await client.getChatById(groupId);
      groupName = groupChat?.name || groupId;
    } catch (e) {
      // fallback: groupId if chat fetch fails
      groupName = groupId;
    }

    // Parse CSV (supporting message and image columns)
    const rawMessages = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (row) => {
          if (row.message) {
            rawMessages.push({
              message: row.message.trim(),
              image: row.image ? row.image.trim() : null,
            });
          }
        })
        .on("end", resolve)
        .on("error", reject);
    });

    fs.unlinkSync(req.file.path); // cleanup

    // Remove exact duplicates (based on message+image)
    const seen = new Set();
    const messages = rawMessages.filter(({ message, image }) => {
      const normalized = (message + (image || '')).replace(/["']/g, '').trim().toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });

    const now = new Date();
    const baseTime = scheduledTime ? new Date(scheduledTime) : now;

    // --- Save campaign with groupName ---
    const campaign = await Campaign.create({
      name,
      sessionId,
      groupId,
      groupName, // <--- add group name here
      scheduledTime: baseTime,
      messageInterval,
    });

    let allSentImmediately = true;

    for (let i = 0; i < messages.length; i++) {
      const { message, image } = messages[i];
      const msgScheduledTime = new Date(
        baseTime.getTime() + i * messageInterval
      );

      let status = "pending";
      let sentAt = null;
      let error = null;
      let mediaUrl = null;

      const now = new Date();

      if (msgScheduledTime <= now) {
        try {
          let localImagePath = null;
          // Handle remote image URLs
          if (image && /^https?:\/\//i.test(image)) {
            localImagePath = await downloadImageToUploads(image);
            mediaUrl = localImagePath;
          } else if (image) {
            // Local image: must exist in /uploads
            localImagePath = path.join(
              __dirname,
              "..",
              "uploads",
              path.basename(image)
            );
            if (!fs.existsSync(localImagePath)) {
              localImagePath = null;
            } else {
              mediaUrl = localImagePath;
            }
          }

          if (localImagePath) {
            const media = MessageMedia.fromFilePath(localImagePath);
            await client.sendMessage(groupId, media, { caption: message });
          } else {
            await client.sendMessage(groupId, message);
          }

          status = "sent";
          sentAt = new Date();
          console.log(`✅ Sent: ${message}${image ? " [image]" : ""}`);
        } catch (err) {
          status = "failed";
          error = err.message;
          allSentImmediately = false;
          console.error(`❌ Failed: ${message}${image ? " [image]" : ""}`, error);
        }

        // Proper delay between each message
        if (i < messages.length - 1) {
          console.log(`⏱ Waiting ${messageInterval}ms before next message...`);
          await wait(messageInterval);
        }
      } else {
        allSentImmediately = false;
        console.log(`⏳ Scheduled for future: ${message}${image ? " [image]" : ""}`);
      }

      // --- Save each message with groupName ---
      await Message.create({
        campaignId: campaign._id,
        content: message,
        sessionId,
        groupId,
        groupName, // <--- add group name here
        status,
        error,
        scheduledAt: msgScheduledTime,
        sentAt,
        mediaUrl,
      });
    }

    campaign.status = allSentImmediately ? "completed" : "active";
    await campaign.save();

    res.json({
      message: "Messages processed correctly without duplicates.",
      campaignId: campaign._id,
    });
  } catch (error) {
    console.error("❌ Error processing CSV:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
// ---------------- GET ALL CAMPAIGNS ----------------
exports.getAllCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find();

    const formattedCampaigns = campaigns.map((campaign) => ({
      ...campaign._doc,
      formattedDate: formatDate(campaign.scheduledTime),
    }));

    res.json(formattedCampaigns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// controllers/campaignController.js
exports.toggleCampaignStatus = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    campaign.status = req.body.status;
    await campaign.save();
    res.json({ message: "Status updated", campaign });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
