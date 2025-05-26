const mongoose = require("mongoose");

const GroupSchema = new mongoose.Schema({
  groupId: String,
  name: String,
});

module.exports = mongoose.model("Group", GroupSchema);
