const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const initWhatsApp = (io) => {
  const client = new Client({ authStrategy: new LocalAuth() });

  client.on('qr', qr => {
    console.log('📲 Scan this QR Code:');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', async () => {
    console.log('✅ WhatsApp is ready');
    io.emit('whatsapp_ready');

    const groupName = "We 3"; // Replace with actual group name
    const group = await getGroupByName(client, groupName);

    if (!group) {
      console.error("❌ Group not found!");
      return;
    }

    const messages = [
      "🚀 Welcome to our campaign!",
      "💡 Tip of the day: Stay consistent.",
      "📞 Contact us anytime!",
    ];

    let index = 0;

    setInterval(() => {
      if (index < messages.length) {
        client.sendMessage(group.id._serialized, messages[index]);
        console.log(`✅ Sent message to group: ${messages[index]}`);
        index++;
      }
    }, 5 * 60 * 1000); // 5-minute interval
  });

  client.on('authenticated', () => {
    console.log('🔐 Authenticated');
  });

  client.on('auth_failure', msg => {
    console.error('❌ Authentication failed', msg);
  });

  client.on('disconnected', reason => {
    console.log('❌ Client was logged out', reason);
  });

  io.on('connection', (socket) => {
    socket.on('send_message', async ({ number, message }) => {
      try {
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        await client.sendMessage(chatId, message);
        socket.emit('message_sent', { number, message });
      } catch (error) {
        socket.emit('error_sending', error.toString());
      }
    });
  });

  client.initialize();
};

const getGroupByName = async (client, groupName) => {
  // const chats = await client.getChats();
  // return chats.find(chat => chat.isGroup && chat.name === groupName);
  const chats = await client.getChats();
const groups = chats.filter(chat => chat.isGroup);
groups.forEach(g => console.log("Group:", g.name));

};

module.exports = initWhatsApp;
