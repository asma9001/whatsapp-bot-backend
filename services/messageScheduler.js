const Message = require('../models/Message');
const Campaign = require('../models/Campaign');
const { clientMap, sendMessageToGroup } = require('../whatsappClient');

async function messageScheduler() {
  try {
    const now = new Date();

    // Get all due messages sorted by scheduled time
    const messagesToSend = await Message.find({
      status: 'pending',
      scheduledAt: { $lte: now }
    }).sort({ scheduledAt: 1 }); // Send in order

    for (const msg of messagesToSend) {
      const campaign = await Campaign.findById(msg.campaignId);
      if (!campaign) {
        msg.status = 'failed';
        msg.error = 'Campaign not found';
        await msg.save();
        continue;
      }

      const client = clientMap[campaign.sessionId];
      if (!client) {
        msg.status = 'failed';
        msg.error = 'WhatsApp client not available';
        await msg.save();
        continue;
      }

      try {
        const messageToSend = msg.mediaUrl
          ? {
              type: 'image+caption',
              mediaUrl: msg.mediaUrl,
              caption: msg.content || '',
            }
          : msg.content;

        await sendMessageToGroup(msg.groupId || campaign.groupId, messageToSend, client);

        msg.status = 'sent';
        msg.sentAt = new Date();
        await msg.save();

        console.log(`✅ Sent scheduled message: ${msg.content || '[Media]'}`);

        // Wait for interval before next message
        await new Promise((resolve) =>
          setTimeout(resolve, campaign.messageInterval || 5000)
        );

        // If all messages done, mark campaign as completed
        const remaining = await Message.countDocuments({
          campaignId: campaign._id,
          status: 'pending'
        });

        if (remaining === 0) {
          campaign.status = 'completed';
          await campaign.save();
        }

      } catch (err) {
        msg.status = 'failed';
        msg.error = err.message;
        await msg.save();
        console.error('❌ Error sending message:', err.message);
      }
    }
  } catch (err) {
    console.error('❌ Error in messageScheduler:', err);
  }
}

module.exports = { messageScheduler };
