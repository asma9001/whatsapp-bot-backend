const { clientMap, getAdminGroups } = require("../whatsappClient");

exports.getGroups = async (req, res) => {
  try {
    const sessionId = req.query.sessionId;
    const client = clientMap[sessionId];
    console.log("Requested sessionId:", sessionId);
    console.log("Available sessions in clientMap:", Object.keys(clientMap));
    if (!client) {
      return res.status(400).json({ error: "WhatsApp client not initialized" });
    }

    if (!client.info) {
      return res
        .status(400)
        .json({
          error: "WhatsApp client not ready yet. Please wait and try again.",
        });
    }

    const groups = await getAdminGroups(client);
    res.json(groups);
  } catch (error) {
    console.error("Failed to get groups:", error);
    res
      .status(500)
      .json({ error: "Failed to get groups", detail: error.message });
  }
};
