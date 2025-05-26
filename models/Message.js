const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
  },
  content: {
    type: String,
  },
  mediaUrl: {
    type: String, // URL for uploaded image/media
  },
  caption: {
    type: String, // optional caption for image
  },
 
  status: {
    type: String,
    enum: ["scheduled", "sent", "failed", "pending"],
    default: "pending",
  },
  scheduledAt: {
    type: Date,
    // required: true,
  },
  sentAt: {
    type: Date,
  },
  error: {
    type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
