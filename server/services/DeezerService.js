/**
 * Service Deezer - Alternative à Spotify
 * API publique, pas besoin de credentials !
 * Documentation: https://developers.deezer.com/api
 */

class DeezerService {
  constructor() {
    this.baseUrl = 'https://api.deezer.com';

    // Playlists Deezer par genre (IDs verifies)
    this.genrePlaylists = {
      pop: [
        '4695117364',   // Best Pop Hits (Taylor Swift, Katy Perry, Ed Sheeran...)
        '10001088582'   // Best Pop Songs of All Time (Glass Animals, BTS, Bruno Mars...)
      ],
      rock: [
        '1306931615',   // Rock Essentials (David Bowie, Pink Floyd, AC/DC...)
        '4034900602'    // Classic Rock HITS (AC/DC, Kinks, Big Brother...)
      ],
      hiphop: [
        '10067544122',  // Classic Hip-Hop (Eric B. & Rakim, LL Cool J, N.W.A...)
        '2341704526'    // Old School Hip Hop (Mobb Deep, Wu-Tang, Nas...)
      ],
      electro: [
        '1495242491',   // Dance Essentials (David Guetta, Hardwell...)
        '1902101402'    // Electronic Hits (HUGEL, Vintage Culture, Fred again...)
      ],
      french: [
        '1884320402',   // Chansons Francaises de Legende
        '700895155',    // Essentiels chanson francaise
        '1420459465'    // Essentiels variete francaise
      ],
      '80s': [
        '2490400844',   // Essential 80s (Nena, Survivor, Cyndi Lauper...)
        '11798808421'   // 80s HITS - 100 Greatest (a-ha, Madonna, Rick Astley...)
      ],
      '90s': [
        '878989033',    // 90s Hits (Nirvana, Oasis, Backstreet Boys...)
        '11798812881'   // 90s HITS - 100 Greatest (Mark Morrison, Snap!, All Saints...)
      ],
      '2000s': [
        '1977689462',   // 00s Party Hits (Eminem, Linkin Park, Shakira...)
        '11153531204'   // 00s HITS - 100 Greatest (Kylie Minogue, Gnarls Barkley...)
      ]
    };

    // Charts par defaut
    this.defaultCharts = [
      'https://api.deezer.com/chart/0/tracks',  // Top mondial
      'https://api.deezer.com/chart/113/tracks' // Top France
    ];

    // Playlists par langue (verifiees)
    this.languagePlaylists = {
      french: [
        '1884320402',   // Chansons Francaises de Legende
        '700895155',    // Essentiels chanson francaise
        '1420459465',   // Essentiels variete francaise
        '1189520191',   // Bleu Blanc Hits
        '957995855',    // Actu Chanson
        '1626235655'    // Feel good chanson
      ],
      english: [
        '3576908782',   // Billboard Top 100 (2010-2014) - Katy Perry, Usher...
        '8893297562',   // British Classics - Queen, Beatles, Elton John...
        '1440322225',   // Billboard Number 1 Hits (2000-2014)
        '11892916601',  // Billboard 1990s Top Hits
        '4020143682',   // Billboard Top 40 Hits 1970s
        '13650203641'   // 2020s Pop Hits
      ],
      spanish: [
        '789123393',    // Reggaeton Classics (Daddy Yankee, Don Omar...)
        '925131455',    // Latino Mix 2026
        '178699142',    // Fuego Latino
        '1273315391',   // Reggaeton Hits
        '3279798822',   // Caliente
        '8952147222'    // Latino annees 2010s
      ],
      mixed: [] // Utilisera les charts par defaut
    };

    // Playlists combinees genre + langue (verifiees)
    this.combinedPlaylists = {
      // Pop
      'pop_french': ['67175576', '10064137882'],
      'pop_english': ['658490995', '13650203641', '3576908782'],
      'pop_spanish': ['2559434604', '2099286188'],

      // Rock
      'rock_french': ['847814561', '1999438682'],
      'rock_english': ['1306931615', '4034900602'],

      // Hip-Hop (separe moderne/classique)
      'hiphop_french_modern': ['5449454322', '1140276541', '12301876691'],
      'hiphop_french_classic': ['1111143121'],
      'hiphop_french': ['5449454322', '1140276541', '1111143121'],
      'hiphop_english_modern': ['1132744911'],
      'hiphop_english_classic': ['10067544122', '2341704526'],
      'hiphop_english': ['1132744911', '10067544122', '2341704526'],
      'hiphop_spanish': ['925131455', '789123393'],

      // Electro
      'electro_english': ['1495242491', '1902101402'],

      // Decennies
      '80s_english': ['2490400844', '11798808421'],
      '90s_english': ['878989033', '11798812881'],
      '2000s_english': ['1977689462', '11153531204']
    };

    // Termes de recherche pour fallback
    this.searchTerms = {
      'pop_french': 'pop francais hits',
      'rock_french': 'rock francais',
      'rock_spanish': 'rock en espanol',
      'electro_french': 'electro francais dj',
      'electro_spanish': 'electronica latina',
      '80s_french': 'annees 80 variete francaise',
      '80s_spanish': '80s latino',
      '90s_french': 'annees 90 francais',
      '90s_spanish': '90s latino',
      '2000s_french': 'annees 2000 francais',
      '2000s_spanish': '2000s latino'
    };
  }

  async getRandomTracks({ count = 10, genre = null, language = 'mixed', rapStyle = 'both' }) {
    const tracks = [];
    const usedIds = new Set();
    const usedArtists = new Set(); // Eviter les doublons d'artistes
    let attempts = 0;
    const maxAttempts = 15;

    while (tracks.length < count && attempts < maxAttempts) {
      attempts++;

      try {
        let data;

        // Priorite 1: Genre + Langue combines
        if (genre && language && language !== 'mixed') {
          data = await this.fetchCombinedTracks(genre, language, rapStyle);
        }
        // Priorite 2: Genre seul (mixed)
        else if (genre && this.genrePlaylists[genre]) {
          data = await this.fetchGenreTracks(genre, rapStyle);
        }
        // Priorite 3: Langue seule
        else if (language && language !== 'mixed' && this.languagePlaylists[language]?.length > 0) {
          const playlists = this.languagePlaylists[language];
          const playlistId = playlists[Math.floor(Math.random() * playlists.length)];
          data = await this.fetchPlaylistTracks(playlistId);
        }
        // Priorite 4: Charts par defaut
        else {
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

  // Recuperer tracks combines genre + langue
  async fetchCombinedTracks(genre, language, rapStyle) {
    // Construire la cle
    let key = `${genre}_${language}`;

    // Cas special pour hip-hop avec style
    if (genre === 'hiphop' && rapStyle !== 'both') {
      key = `${genre}_${language}_${rapStyle}`;
    }

    // Essayer playlist combinee
    if (this.combinedPlaylists[key]?.length > 0) {
      const playlists = this.combinedPlaylists[key];
      const playlistId = playlists[Math.floor(Math.random() * playlists.length)];
      const data = await this.fetchPlaylistTracks(playlistId);
      if (data?.length > 0) return data;
    }

    // Fallback: recherche avec termes combines
    const searchKey = `${genre}_${language}`;
    if (this.searchTerms[searchKey]) {
      const data = await this.searchTracks(this.searchTerms[searchKey]);
      if (data?.length > 0) return data;
    }

    // Fallback final: genre seul
    return await this.fetchGenreTracks(genre, rapStyle);
  }

  // Recuperer tracks par genre (avec gestion rapStyle pour hip-hop)
  async fetchGenreTracks(genre, rapStyle) {
    // Cas special pour hip-hop
    if (genre === 'hiphop' && rapStyle !== 'both') {
      const styleKey = rapStyle === 'modern' ? 'hiphop_english_modern' : 'hiphop_english_classic';
      if (this.combinedPlaylists[styleKey]?.length > 0) {
        const playlists = this.combinedPlaylists[styleKey];
        const playlistId = playlists[Math.floor(Math.random() * playlists.length)];
        return await this.fetchPlaylistTracks(playlistId);
      }
    }

    // Genre standard
    if (this.genrePlaylists[genre]) {
      const playlists = this.genrePlaylists[genre];
      const playlistId = playlists[Math.floor(Math.random() * playlists.length)];
      return await this.fetchPlaylistTracks(playlistId);
    }

    return [];
  }

  // Recherche avec un terme specifique
  async searchTracks(query) {
    try {
      const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}&limit=100`);
      const data = await response.json();

      if (data.error) {
        console.warn(`Search error for "${query}":`, data.error.message);
        return [];
      }

      return data.data || [];
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
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
