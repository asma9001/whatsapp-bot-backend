const mongoose = require('mongoose');
const messageLogSchema = new mongoose.Schema({
  campaignId: mongoose.Schema.Types.ObjectId,
  content: String,
  to: String,
  status: String,
  sentAt: Date
});
module.exports = mongoose.model('MessageLog', messageLogSchema);
