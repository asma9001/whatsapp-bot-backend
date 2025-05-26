const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const csv = require("csv-parser");
const clientMap = {}; // sessionId => client

function createClient(sessionId) {
  if (clientMap[sessionId]) return clientMap[sessionId];

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: sessionId }),
    puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]}
  });

  clientMap[sessionId] = client; // ✅ Store immediately so it's available

  client.on("qr", (qr) => {
    console.log(`📱 Scan this QR for session: ${sessionId}`);
    if (global.io) {
      global.io.to(sessionId).emit(`qr-${sessionId}`, qr);
    }
  });

  client.on("ready", () => {
    console.log(`✅ WhatsApp ready for session: ${sessionId}`);
    if (global.io) {
      global.io.to(sessionId).emit(`authenticated-${sessionId}`);
    }
  });

  client.initialize(); // 🚀 Start the client
  return client; // ✅ Return always
}

async function waitForReady(client) {
  return new Promise((resolve, reject) => {
    if (client.info) return resolve();

    const onReady = () => {
      client.off("auth_failure", onAuthFailure);
      resolve();
    };

    const onAuthFailure = (msg) => {
      client.off("ready", onReady);
      reject(new Error("Authentication failure: " + msg));
    };

    client.once("ready", onReady);
    client.once("auth_failure", onAuthFailure);
  });
}

async function getAdminGroups(client) {
  const chats = await client.getChats();
  const groups = chats.filter((chat) => chat.isGroup);
  const adminGroups = [];

  for (const group of groups) {
    const isAdmin = group.participants?.some(
      (p) =>
        p.id._serialized === client.info.wid._serialized &&
        (p.isAdmin || p.isSuperAdmin)
    );

    if (isAdmin) {
      adminGroups.push({
        id: group.id._serialized,
        name: group.name,
      });
    }
  }

  return adminGroups;
}

async function downloadImageToUploads(url) {
  try {
    const ext = path.extname(new URL(url).pathname) || '.jpg';
    const filename = 'img_' + Date.now() + Math.floor(Math.random() * 1000) + ext;
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const filepath = path.join(uploadDir, filename);
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(filepath, response.data);
    return filepath;
  } catch (err) {
    console.error(`❌ Error downloading image from ${url}:`, err.message);
    throw err;
  }
}

/**
 * Send message or image to WhatsApp group using whatsapp-web.js client.
 */
async function sendMessageToGroup(groupId, msg, client) {
  if (!client) throw new Error("Client not provided");

  try {
    if (typeof msg === "string") {
      // Simple string message
      await client.sendMessage(groupId, msg);
    } else if (msg.type === "text") {
      await client.sendMessage(groupId, msg.text);
    } else if (msg.type === "image" || msg.type === "image+caption") {
      if (!msg.mediaUrl) throw new Error("No mediaUrl provided");

      const media = MessageMedia.fromFilePath(msg.mediaUrl);
      await client.sendMessage(groupId, media, {
        caption: msg.caption || "",
      });
    } else {
      throw new Error("Unsupported message type");
    }
  } catch (error) {
    console.error("❌ Error sending message:", error.message);
    throw error;
  }
}


// --- Persistent multi-session restore logic ---

// This is where whatsapp-web.js stores LocalAuth sessions by default
const SESSIONS_BASE = path.join(__dirname, ".wwebjs_auth");
if (fs.existsSync(SESSIONS_BASE)) {
  fs.readdirSync(SESSIONS_BASE).forEach((sessionId) => {
    // Only restore directories (each session is a directory)
    const sessionPath = path.join(SESSIONS_BASE, sessionId);
    if (fs.statSync(sessionPath).isDirectory()) {
      console.log(`🔄 Restoring WhatsApp session: ${sessionId}`);
      createClient(sessionId);
    }
  });
}

module.exports = {
  createClient,
  clientMap,
  getAdminGroups,
  sendMessageToGroup,
  waitForReady,
  downloadImageToUploads,
};
