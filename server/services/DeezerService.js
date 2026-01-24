/**
 * Service Deezer - Alternative à Spotify
 * API publique, pas besoin de credentials !
 * Documentation: https://developers.deezer.com/api
 */

class DeezerService {
  constructor() {
    this.baseUrl = 'https://api.deezer.com';

    // Playlists Deezer par genre (IDs publics)
    this.genrePlaylists = {
      pop: [
        '1111141961',  // Top France
        '1313621735',  // Hits du moment
        '1282495565'   // Pop Hits
      ],
      rock: [
        '1280927871',  // Rock Classics
        '1313619735',  // Rock Hits
        '987654321'    // Alternative Rock
      ],
      hiphop: [
        '1111143121',  // Rap FR
        '1313622775',  // Hip Hop Hits
        '2098157264'   // Rap Francais
      ],
      electro: [
        '1111142221',  // Electro
        '1313620735',  // Dance Hits
        '1282495575'   // EDM Bangers
      ],
      french: [
        '1111141961',  // Top France
        '1313624735',  // Variete Francaise
        '1109890291'   // Chanson Francaise
      ],
      '80s': [
        '1313616735',  // 80s Hits
        '1128147861',  // Best of 80s
        '1282495585'   // 80s Classics
      ],
      '90s': [
        '1313617735',  // 90s Hits
        '1128147871',  // Best of 90s
        '1282495595'   // 90s Classics
      ],
      '2000s': [
        '1313618735',  // 2000s Hits
        '1282495605',  // Best of 2000s
        '1128147881'   // 2000s Classics
      ]
    };

    // Charts par defaut
    this.defaultCharts = [
      'https://api.deezer.com/chart/0/tracks',  // Top mondial
      'https://api.deezer.com/chart/113/tracks' // Top France
    ];

    // Playlists par langue
    this.languagePlaylists = {
      french: [
        '1111141961',   // Top France
        '1109890291',   // Chanson Francaise
        '1313624735',   // Variete Francaise
        '1111143121',   // Rap FR
        '4403076402',   // French Hits
        '1996494362'    // 100% Francais
      ],
      english: [
        '1313621735',   // Top US
        '1282495565',   // Pop Hits
        '1280927871',   // Rock Classics
        '1313622775',   // Hip Hop Hits
        '3155776842',   // UK Top 50
        '1116189381'    // Top USA
      ],
      spanish: [
        '4823961464',   // Latino Hits
        '1313623735',   // Reggaeton
        '2701314554',   // Top Espana
        '4403120062',   // Latin Pop
        '1282495615'    // Spanish Hits
      ],
      mixed: [] // Utilisera les charts par defaut
    };
  }

  async getRandomTracks({ count = 10, genre = null, language = 'mixed' }) {
    const tracks = [];
    const usedIds = new Set();
    const usedArtists = new Set(); // Eviter les doublons d'artistes
    let attempts = 0;
    const maxAttempts = 15;

    while (tracks.length < count && attempts < maxAttempts) {
      attempts++;

      try {
        let data;

        if (genre && this.genrePlaylists[genre]) {
          // Recuperer depuis une playlist du genre
          const playlists = this.genrePlaylists[genre];
          const playlistId = playlists[Math.floor(Math.random() * playlists.length)];
          data = await this.fetchPlaylistTracks(playlistId);
        } else if (language && language !== 'mixed' && this.languagePlaylists[language]?.length > 0) {
          // Recuperer depuis une playlist de la langue choisie
          const playlists = this.languagePlaylists[language];
          const playlistId = playlists[Math.floor(Math.random() * playlists.length)];
          data = await this.fetchPlaylistTracks(playlistId);
        } else {
          // Utiliser les charts par defaut
          data = await this.fetchChartTracks();
        }

        if (!data || !data.length) {
          // Fallback: recherche par genre
          data = await this.searchByGenre(genre || 'pop');
        }

        // Melanger les donnees pour plus de variete
        data = this.shuffleArray(data);

        // Filtrer et ajouter les tracks
        for (const track of data) {
          if (!track.preview || usedIds.has(track.id)) continue;

          // Normaliser le nom de l'artiste pour la comparaison
          const artistKey = track.artist.name.toLowerCase().trim();

          // Eviter les doublons d'artistes
          if (usedArtists.has(artistKey)) continue;

          usedIds.add(track.id);
          usedArtists.add(artistKey);
          tracks.push({
            id: track.id.toString(),
            title: track.title,
            artist: track.artist.name,
            allArtists: [track.artist.name],
            previewUrl: track.preview,
            albumCover: track.album?.cover_medium || track.album?.cover || null
          });

          if (tracks.length >= count) break;
        }

      } catch (error) {
        console.error('Deezer API error:', error.message);
      }
    }

    if (tracks.length === 0) {
      throw new Error('NO_TRACKS_FOUND');
    }

    return this.shuffleArray(tracks).slice(0, count);
  }

  async fetchPlaylistTracks(playlistId) {
    try {
      const response = await fetch(`${this.baseUrl}/playlist/${playlistId}/tracks?limit=100`);
      const data = await response.json();

      if (data.error) {
        console.warn(`Playlist ${playlistId} error:`, data.error.message);
        return [];
      }

      return data.data || [];
    } catch (error) {
      console.error('Fetch playlist error:', error);
      return [];
    }
  }

  async fetchChartTracks() {
    try {
      const response = await fetch(`${this.baseUrl}/chart/0/tracks?limit=100`);
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Fetch chart error:', error);
      return [];
    }
  }

  async searchByGenre(genre) {
    try {
      // Mapping des genres vers des termes de recherche
      const searchTerms = {
        pop: 'pop hits',
        rock: 'rock classic',
        hiphop: 'rap francais',
        electro: 'dance electronic',
        french: 'chanson francaise',
        '80s': '80s hits',
        '90s': '90s hits',
        '2000s': '2000s hits'
      };

      const term = searchTerms[genre] || 'hits';
      const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(term)}&limit=100`);
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Toujours disponible - pas besoin de configuration
  isConfigured() {
    return true;
  }
}

module.exports = new DeezerService();
