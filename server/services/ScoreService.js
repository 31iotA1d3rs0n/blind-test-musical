class ScoreService {
  constructor() {
    this.config = {
      // Points de base
      BASE_POINTS: {
        TITLE: 1,
        ARTIST: 1,
        BOTH: 3  // Bonus si trouve en une seule reponse
      },

      // Bonus vitesse (position dans les reponses correctes du round)
      SPEED_BONUS: {
        FIRST: 2,   // Premier a trouver
        SECOND: 1,  // Deuxieme
        OTHER: 0    // Suivants
      },

      // Bonus streak (tours consecutifs avec au moins une bonne reponse)
      STREAK_BONUS: {
        3: 1,   // 3 tours consecutifs = +1
        5: 2,   // 5 tours = +2
        10: 5   // 10 tours = +5
      }
    };
  }

  calculatePoints({ answerType, position, streak }) {
    let points = 0;

    // Points de base
    if (answerType === 'both') {
      points = this.config.BASE_POINTS.BOTH;
    } else if (answerType === 'title') {
      points = this.config.BASE_POINTS.TITLE;
    } else if (answerType === 'artist') {
      points = this.config.BASE_POINTS.ARTIST;
    }

    // Bonus vitesse
    if (position === 0) {
      points += this.config.SPEED_BONUS.FIRST;
    } else if (position === 1) {
      points += this.config.SPEED_BONUS.SECOND;
    }

    // Bonus streak
    const streakThresholds = Object.keys(this.config.STREAK_BONUS)
      .map(Number)
      .sort((a, b) => b - a);

    for (const threshold of streakThresholds) {
      if (streak >= threshold) {
        points += this.config.STREAK_BONUS[threshold];
        break;
      }
    }

    return points;
  }

  getPointsBreakdown({ answerType, position, streak }) {
    const breakdown = [];

    // Base
    if (answerType === 'both') {
      breakdown.push({ label: 'Titre + Artiste', points: 3 });
    } else {
      breakdown.push({
        label: answerType === 'title' ? 'Titre' : 'Artiste',
        points: 1
      });
    }

    // Vitesse
    if (position === 0) {
      breakdown.push({ label: 'Premier!', points: 2 });
    } else if (position === 1) {
      breakdown.push({ label: 'Deuxieme', points: 1 });
    }

    // Streak
    const streakThresholds = Object.keys(this.config.STREAK_BONUS)
      .map(Number)
      .sort((a, b) => b - a);

    for (const threshold of streakThresholds) {
      if (streak >= threshold) {
        breakdown.push({
          label: `Serie de ${streak}`,
          points: this.config.STREAK_BONUS[threshold]
        });
        break;
      }
    }

    return breakdown;
  }
}

module.exports = new ScoreService();
