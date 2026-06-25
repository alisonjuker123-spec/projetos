require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const alunosRoutes = require('./routes/alunos');
const retiradasRoutes = require('./routes/retiradas');

// Initialize DB & seed on startup
const { getDb } = require('./db/database');
getDb(); // ensures schema is created

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Attach io to app so routes can access it
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/alunos', alunosRoutes);
app.use('/api/retiradas', retiradasRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SaiEscola backend running on port ${PORT}`);
});

module.exports = { app, server, io };
