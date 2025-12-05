const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  team: {
    type: String,
    required: false
  },
  role: {
    type: String,
    enum: ['Batsman', 'Bowler', 'Allrounder', 'Wicket-keeper', 'Unknown'],
    default: 'Unknown'
  },
  battingStyle: {
    type: String,
    required: false
  },
  bowlingStyle: {
    type: String,
    required: false
  },
  totalRuns: {
    type: Number,
    default: 0
  },
  average: {
    type: Number,
    default: 0
  },
  strikeRate: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Player', playerSchema);
