class ScoreService {
  constructor() {
    this.config = {
      BASE_POINTS: {
        TITLE: 1,
        ARTIST: 1,
        BOTH: 3
      },

      SPEED_BONUS: {
        FIRST: 2,
        SECOND: 1,
        OTHER: 0
      },

      STREAK_BONUS: {
        3: 1,
        5: 2,
        10: 5
      }
    };
  }

  calculatePoints({ answerType, position, streak }) {
    let points = 0;

    if (answerType === 'both') {
      points = this.config.BASE_POINTS.BOTH;
    } else if (answerType === 'title') {
      points = this.config.BASE_POINTS.TITLE;
    } else if (answerType === 'artist') {
      points = this.config.BASE_POINTS.ARTIST;
    }

    if (position === 0) {
      points += this.config.SPEED_BONUS.FIRST;
    } else if (position === 1) {
      points += this.config.SPEED_BONUS.SECOND;
    }

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

    if (answerType === 'both') {
      breakdown.push({ label: 'Titre + Artiste', points: 3 });
    } else {
      breakdown.push({
        label: answerType === 'title' ? 'Titre' : 'Artiste',
        points: 1
      });
    }

    if (position === 0) {
      breakdown.push({ label: 'Premier!', points: 2 });
    } else if (position === 1) {
      breakdown.push({ label: 'Deuxieme', points: 1 });
    }

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
