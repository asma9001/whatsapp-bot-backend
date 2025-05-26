const mongoose = require("mongoose");

const CampaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
    },
    groupId: {
      type: String,
      required: true,
    },
    scheduledTime: {
      type: Date,
      // required: true,
    },
    // caption:{
    //    type: String,
    //   required: true,
    // },
    status: {
      type: String,
      enum: ["active", "paused", "completed"],
      default: "active",
    },
    groupName: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Campaign", CampaignSchema);
