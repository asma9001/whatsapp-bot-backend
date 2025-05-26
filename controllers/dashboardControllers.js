const Campaign = require("../models/Campaign");
const Message = require("../models/Message");
exports.getTotalCampaigns = async (req, res) => {
  try {
    const total = await Campaign.countDocuments();
    res.json({ totalCampaigns: total });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch total campaigns" });
  }
};
exports.getMessagesSent = async (req, res) => {
  try {
    const sent = await Message.countDocuments({ status: "sent" });
    res.json({ messagesSent: sent });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages sent" });
  }
};
exports.getFailedMessages = async (req, res) => {
  try {
    const failed = await Message.countDocuments({ status: "failed" });
    res.json({ failedMessages: failed });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch failed messages" });
  }
};
exports.getQueuedMessages = async (req, res) => {
  try {
    const queued = await Message.countDocuments({ status: "pending" });
    res.json({ queuedMessages: queued });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch queued messages" });
  }
};

// GET /api/dashboard/recent-campaigns
exports.getRecentCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find()
      .sort({ createdAt: -1 }) // Most recent first
      .limit(4);
    console.log(campaigns);
    const formatted = await Promise.all(
      campaigns.map(async (campaign) => {
        const totalMessages = await Message.countDocuments({
          campaignId: campaign._id,
        });
        const sentMessages = await Message.countDocuments({
          campaignId: campaign._id,
          status: "sent",
        });

        const progress =
          totalMessages === 0
            ? 0
            : Math.round((sentMessages / totalMessages) * 100);

        return {
          title: campaign.name,
          status: campaign.status, // pending / active / completed / paused
          progress,
          messages: `${sentMessages} / ${totalMessages} messages`,
          started: campaign.scheduledTime,
        };
      })
    );

    res.json(formatted);
  } catch (err) {
    console.error("Error in getRecentCampaigns:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// GET /api/dashboard/upcoming-messages
exports.getUpcomingMessages = async (req, res) => {
  try {
    const now = new Date();

    const upcomingCampaigns = await Message.find({
      scheduledAt: { $gt: now },
    })
      .sort({ scheduledAt: 1 })
      .limit(5);

    // Get all unique campaignIds
    const campaignIds = upcomingCampaigns.map((msg) => msg.campaignId);

    // Fetch related campaigns
    const campaigns = await Campaign.find({ _id: { $in: campaignIds } });

    // Map campaign info to messages
    const campaignsMap = {};
    campaigns.forEach((camp) => {
      campaignsMap[camp._id] = camp;
    });

    // Attach campaign info to each message
    const messagesWithCampaign = upcomingCampaigns.map((msg) => ({
      ...msg.toObject(),
      campaignInfo: campaignsMap[msg.campaignId] || null,
    }));

    res.json({ success: true, upcomingCampaigns: messagesWithCampaign });
  } catch (error) {
    console.error("Error fetching upcoming campaigns:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
exports.getSentMessages = async (req, res) => {
  try {
    const sentCampaigns = await Message.find({
      status: "sent",
    })
      .sort({ scheduledAt: 1 })
      .limit(5);

    // Get all unique campaignIds
    const campaignIds = sentCampaigns.map((msg) => msg.campaignId);

    // Fetch related campaigns
    const campaigns = await Campaign.find({ _id: { $in: campaignIds } });

    // Map campaign info to messages
    const campaignsMap = {};
    campaigns.forEach((camp) => {
      campaignsMap[camp._id] = camp;
    });

    // Attach campaign info to each message
    const messagesWithCampaign = sentCampaigns.map((msg) => ({
      ...msg.toObject(),
      campaignInfo: campaignsMap[msg.campaignId] || null,
    }));

    res.json({ success: true, sentCampaigns: messagesWithCampaign });
  } catch (error) {
    console.error("Error fetching upcoming campaigns:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
