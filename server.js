const express = require('express');
const http = require('http');
const cors = require('cors');
const socketIo = require('socket.io');
const connectDb = require('./config/db');
const path = require("path");
require('dotenv').config();
const bodyParser = require('body-parser');

const campaignRoutes = require('./routes/campaignRoutes');
const groupRoutes = require('./routes/groupRoutes');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const sessionRoutes = require('./routes/sessionRoutes');

const { createClient } = require('./whatsappClient');
const { messageScheduler } = require('./services/messageScheduler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

// Make io accessible globally for whatsappClient.js
global.io = io;

const allowedOrigins = [
  'http://localhost:5173',
  'https://whatsapp-compaign-weld.vercel.app'  // 👈 Replace with your actual Vercel domain
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(bodyParser.json());
app.use("/uploads/csv", express.static(path.join(__dirname, "uploads/csv")));
app.use('/uploads', express.static('uploads'));

// Register API routes
app.use('/api', campaignRoutes);
app.use('/api', groupRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', sessionRoutes);
app.get("/", (req, res) => {
  res.send("✅ Backend is running!");
});
// Handle socket.io rooms for sessions
io.on('connection', (socket) => {
  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
  });
});

const PORT = process.env.PORT || 5000;

// Connect to database and only start server/scheduler after successful connection
connectDb().then(() => {
  // Start the scheduler every 5 seconds
  setInterval(() => {
    messageScheduler();
  }, 5000);

  server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}).catch((err) => {
  console.error('❌ Failed to connect to MongoDB:', err);
  process.exit(1);
});
