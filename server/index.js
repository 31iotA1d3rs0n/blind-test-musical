require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const routes = require('./routes');
const initializeSocket = require('./socket');

// Configuration
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Express app
const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: CORS_ORIGIN
}));
app.use(express.json());

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, '../public')));

// Routes API
app.use('/api', routes);

// SPA fallback - renvoyer index.html pour toutes les autres routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Initialiser Socket.io
initializeSocket(io);

// Demarrer le serveur
server.listen(PORT, () => {
  console.log(`
  ====================================
  🎵 Blind Test Musical Server
  ====================================

  Server running on http://localhost:${PORT}

  Environment: ${process.env.NODE_ENV || 'development'}
  Music API: Deezer (no config needed!)

  ====================================
  `);
});

// Gestion des erreurs
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
