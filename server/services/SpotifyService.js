const SpotifyWebApi = require('spotify-web-api-node');
const spotifyConfig = require('../config/spotify');

class SpotifyService {
  constructor() {
    this.spotifyApi = new SpotifyWebApi({
      clientId: spotifyConfig.clientId,
      clientSecret: spotifyConfig.clientSecret
    });
    this.tokenExpiry = null;
  }

  async ensureToken() {
    // Verifier si le token est encore valide
    if (this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return;
    }

    try {
      const data = await this.spotifyApi.clientCredentialsGrant();
      this.spotifyApi.setAccessToken(data.body.access_token);
      // Expiration avec 60 secondes de marge
      this.tokenExpiry = Date.now() + (data.body.expires_in - 60) * 1000;
      console.log('Spotify token refreshed');
    } catch (error) {
      console.error('Failed to get Spotify token:', error);
      throw new Error('SPOTIFY_AUTH_FAILED');
    }
  }

  async getRandomTracks({ count = 10, genre = null }) {
    await this.ensureToken();

    const tracks = [];
    const usedIds = new Set();

    // Selectionner les playlists selon le genre
    const playlistIds = genre && spotifyConfig.genrePlaylists[genre]
      ? spotifyConfig.genrePlaylists[genre]
      : spotifyConfig.defaultPlaylists;

    let attempts = 0;
    const maxAttempts = 10;

    while (tracks.length < count && attempts < maxAttempts) {
      attempts++;

      const playlistId = playlistIds[Math.floor(Math.random() * playlistIds.length)];
      const offset = Math.floor(Math.random() * 50);

      try {
        const response = await this.spotifyApi.getPlaylistTracks(playlistId, {
          limit: 50,
          offset,
          fields: 'items(track(id,name,artists,preview_url,album(images)))'
        });

        for (const item of response.body.items) {
          // Ignorer les tracks sans preview ou deja utilisees
          if (!item.track || !item.track.preview_url) continue;
          if (usedIds.has(item.track.id)) continue;

          usedIds.add(item.track.id);
          tracks.push({
            id: item.track.id,
            title: item.track.name,
            artist: item.track.artists[0].name,
            allArtists: item.track.artists.map(a => a.name),
            previewUrl: item.track.preview_url,
            albumCover: item.track.album.images[0]?.url || null
          });

          if (tracks.length >= count) break;
        }
      } catch (error) {
        console.error('Spotify API error:', error.message);
        // Continuer avec d'autres playlists
      }
    }

    if (tracks.length === 0) {
      throw new Error('NO_TRACKS_FOUND');
    }

    return this.shuffleArray(tracks).slice(0, count);
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Verification de la configuration
  isConfigured() {
    return !!(spotifyConfig.clientId && spotifyConfig.clientSecret);
  }
}

module.exports = new SpotifyService();
