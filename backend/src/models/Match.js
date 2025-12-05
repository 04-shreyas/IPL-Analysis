const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  matchId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  match_id: {  // Keep for backward compatibility
    type: Number,
    required: false,
    index: true
  },
  season: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: false
  },
  city: {
    type: String,
    required: false
  },
  venue: {
    type: String,
    required: false
  },
  team1: {
    type: String,
    required: true
  },
  team2: {
    type: String,
    required: true
  },
  tossWinner: {
    type: String,
    required: false
  },
  tossDecision: {
    type: String,
    enum: ['bat', 'field', ''],
    default: ''
  },
  winner: {
    type: String,
    required: false
  },
  result: {
    type: String,
    required: false
  },
  player_of_match: {
    type: String,
    required: false
  },
  stage: {
    type: String,
    required: false
  },
  umpire1: {
    type: String,
    required: false
  },
  umpire2: {
    type: String,
    required: false
  },
  umpire3: {
    type: String,
    required: false
  },
  firstInningsScore: {
    type: Number,
    required: false
  },
  secondInningsScore: {
    type: Number,
    required: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Match', matchSchema);
