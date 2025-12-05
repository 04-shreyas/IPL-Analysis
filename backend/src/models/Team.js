const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  shortName: {
    type: String,
    required: false
  },
  city: {
    type: String,
    required: false
  },
  homeVenue: {
    type: String,
    required: false
  },
  totalMatches: {
    type: Number,
    default: 0
  },
  totalWins: {
    type: Number,
    default: 0
  },
  homeWins: {
    type: Number,
    default: 0
  },
  awayWins: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Team', teamSchema);
