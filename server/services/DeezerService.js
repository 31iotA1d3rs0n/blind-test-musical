class DeezerService {
  constructor() {
    this.baseUrl = 'https://api.deezer.com';

    this.genrePlaylists = {
      pop: [
        '4695117364',
        '10001088582'
      ],
      rock: [
        '1306931615',
        '4034900602'
      ],
      hiphop: [
        '10067544122',
        '2341704526'
      ],
      electro: [
        '1495242491',
        '1902101402'
      ],
      french: [
        '1884320402',
        '700895155',
        '1420459465'
      ],
      '80s': [
        '2490400844',
        '11798808421'
      ],
      '90s': [
        '878989033',
        '11798812881'
      ],
      '2000s': [
        '1977689462',
        '11153531204'
      ]
    };

    this.defaultCharts = [
      'https://api.deezer.com/chart/0/tracks',
      'https://api.deezer.com/chart/113/tracks'
    ];

    this.languagePlaylists = {
      french: [
        '1884320402',
        '700895155',
        '1420459465',
        '1189520191',
        '957995855',
        '1626235655'
      ],
      english: [
        '3576908782',
        '8893297562',
        '1440322225',
        '11892916601',
        '4020143682',
        '13650203641'
      ],
      spanish: [
        '789123393',
        '925131455',
        '178699142',
        '1273315391',
        '3279798822',
        '8952147222'
      ],
      mixed: []
    };

    this.combinedPlaylists = {
      'pop_french': ['67175576', '10064137882'],
      'pop_english': ['658490995', '13650203641', '3576908782'],
      'pop_spanish': ['2559434604', '2099286188'],

      'rock_french': ['847814561', '1999438682'],
      'rock_english': ['1306931615', '4034900602'],

      'hiphop_french_modern': ['5449454322', '1140276541', '12301876691'],
      'hiphop_french_classic': ['1111143121'],
      'hiphop_french': ['5449454322', '1140276541', '1111143121'],
      'hiphop_english_modern': ['1132744911'],
      'hiphop_english_classic': ['10067544122', '2341704526'],
      'hiphop_english': ['1132744911', '10067544122', '2341704526'],
      'hiphop_spanish': ['925131455', '789123393'],

      'electro_english': ['1495242491', '1902101402'],

      '80s_english': ['2490400844', '11798808421'],
      '90s_english': ['878989033', '11798812881'],
      '2000s_english': ['1977689462', '11153531204']
    };

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
    const usedArtists = new Set();
    let attempts = 0;
    const maxAttempts = 15;

    while (tracks.length < count && attempts < maxAttempts) {
      attempts++;

      try {
        let data;

        if (genre && language && language !== 'mixed') {
          data = await this.fetchCombinedTracks(genre, language, rapStyle);
        }
        else if (genre && this.genrePlaylists[genre]) {
          data = await this.fetchGenreTracks(genre, rapStyle);
        }
        else if (language && language !== 'mixed' && this.languagePlaylists[language]?.length > 0) {
          const playlists = this.languagePlaylists[language];
          const playlistId = playlists[Math.floor(Math.random() * playlists.length)];
          data = await this.fetchPlaylistTracks(playlistId);
        }
        else {
          data = await this.fetchChartTracks();
        }

        if (!data || !data.length) {
          data = await this.searchByGenre(genre || 'pop');
        }

        data = this.shuffleArray(data);

        for (const track of data) {
          if (!track.preview || usedIds.has(track.id)) continue;

          const artistKey = track.artist.name.toLowerCase().trim();

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

  async fetchCombinedTracks(genre, language, rapStyle) {
    let key = `${genre}_${language}`;

    if (genre === 'hiphop' && rapStyle !== 'both') {
      key = `${genre}_${language}_${rapStyle}`;
    }

    if (this.combinedPlaylists[key]?.length > 0) {
      const playlists = this.combinedPlaylists[key];
      const playlistId = playlists[Math.floor(Math.random() * playlists.length)];
      const data = await this.fetchPlaylistTracks(playlistId);
      if (data?.length > 0) return data;
    }

    const searchKey = `${genre}_${language}`;
    if (this.searchTerms[searchKey]) {
      const data = await this.searchTracks(this.searchTerms[searchKey]);
      if (data?.length > 0) return data;
    }

    return await this.fetchGenreTracks(genre, rapStyle);
  }

  async fetchGenreTracks(genre, rapStyle) {
    if (genre === 'hiphop' && rapStyle !== 'both') {
      const styleKey = rapStyle === 'modern' ? 'hiphop_english_modern' : 'hiphop_english_classic';
      if (this.combinedPlaylists[styleKey]?.length > 0) {
        const playlists = this.combinedPlaylists[styleKey];
        const playlistId = playlists[Math.floor(Math.random() * playlists.length)];
        return await this.fetchPlaylistTracks(playlistId);
      }
    }

    if (this.genrePlaylists[genre]) {
      const playlists = this.genrePlaylists[genre];
      const playlistId = playlists[Math.floor(Math.random() * playlists.length)];
      return await this.fetchPlaylistTracks(playlistId);
    }

    return [];
  }

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

  isConfigured() {
    return true;
  }
}

module.exports = new DeezerService();
