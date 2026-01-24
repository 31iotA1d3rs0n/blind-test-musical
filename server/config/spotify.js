module.exports = {
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,

  // Playlists Spotify par genre (IDs publics)
  genrePlaylists: {
    pop: [
      '37i9dQZF1DXcBWIGoYBM5M',  // Today's Top Hits
      '37i9dQZF1DX0kbJZpiYdZl'   // Hot Hits France
    ],
    rock: [
      '37i9dQZF1DXcF6B6QPhFDv',  // Rock This
      '37i9dQZF1DX1lVhptIYRda'   // Classic Rock
    ],
    hiphop: [
      '37i9dQZF1DX0XUsuxWHRQd',  // RapCaviar
      '37i9dQZF1DWU4xkXueiKGW'   // Rap FR
    ],
    electro: [
      '37i9dQZF1DX4dyzvuaRJ0n',  // mint
      '37i9dQZF1DX0BcQWzuB7ZO'   // Dance Hits
    ],
    french: [
      '37i9dQZF1DX1X7WV84927n',  // Variete Francaise
      '37i9dQZF1DWVzZlRWgqAGH'   // Hits France
    ],
    '80s': [
      '37i9dQZF1DX4UtSsGT1Sbe',  // All Out 80s
      '37i9dQZF1DXb57FjYWz00c'   // 80s Rock Anthems
    ],
    '90s': [
      '37i9dQZF1DXbTxeAdrVG2l',  // All Out 90s
      '37i9dQZF1DX4o1oenSJRJd'   // 90s Hits
    ],
    '2000s': [
      '37i9dQZF1DX4o1oenSJRJd',  // All Out 2000s
      '37i9dQZF1DX3LyU0mhfqgP'   // 2000s Hits
    ]
  },

  // Playlists par defaut (mix populaire)
  defaultPlaylists: [
    '37i9dQZF1DXcBWIGoYBM5M',  // Today's Top Hits
    '37i9dQZF1DX0kbJZpiYdZl',  // Hot Hits France
    '37i9dQZF1DX1X7WV84927n',  // Variete Francaise
    '37i9dQZF1DWVzZlRWgqAGH'   // Hits France
  ]
};
