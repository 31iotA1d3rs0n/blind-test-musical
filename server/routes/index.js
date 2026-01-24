const express = require('express');
const router = express.Router();
const RoomService = require('../services/RoomService');
const DeezerService = require('../services/DeezerService');

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    musicApi: 'deezer',
    configured: DeezerService.isConfigured(),
    timestamp: new Date().toISOString()
  });
});

// Liste des rooms publiques
router.get('/rooms', (req, res) => {
  const rooms = RoomService.getPublicRooms();
  res.json(rooms);
});

// Info d'une room specifique
router.get('/rooms/:code', (req, res) => {
  const room = RoomService.getRoom(req.params.code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json(room.toPublicJSON());
});

// Verifier si une room existe (pour rejoindre)
router.get('/rooms/:code/exists', (req, res) => {
  const room = RoomService.getRoom(req.params.code);
  if (!room) {
    return res.json({ exists: false });
  }
  res.json({
    exists: true,
    isFull: room.isFull(),
    isStarted: room.isStarted(),
    playerCount: room.getPlayerCount(),
    maxPlayers: room.maxPlayers
  });
});

// Genres disponibles
router.get('/genres', (req, res) => {
  res.json([
    { id: 'pop', name: 'Pop' },
    { id: 'rock', name: 'Rock' },
    { id: 'hiphop', name: 'Hip-Hop / Rap' },
    { id: 'electro', name: 'Electro / Dance' },
    { id: 'french', name: 'Variete Francaise' },
    { id: '80s', name: 'Annees 80' },
    { id: '90s', name: 'Annees 90' },
    { id: '2000s', name: 'Annees 2000' }
  ]);
});

module.exports = router;
