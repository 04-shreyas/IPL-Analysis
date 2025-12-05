const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  matchId: {
    type: Number,
    required: true,
    index: true
  },
  match_id: {  // Keep for backward compatibility
    type: Number,
    required: false,
    index: true
  },
  inning: {
    type: Number,
    required: true
  },
  over: {
    type: Number,
    required: true
  },
  ball: {
    type: Number,
    required: true
  },
  battingTeam: {
    type: String,
    required: true
  },
  bowlingTeam: {
    type: String,
    required: true
  },
  batsman: {
    type: String,
    required: true
  },
  nonStriker: {
    type: String,
    required: true
  },
  bowler: {
    type: String,
    required: true
  },
  isSuperOver: {
    type: Boolean,
    default: false
  },
  wideRuns: {
    type: Number,
    default: 0
  },
  byeRuns: {
    type: Number,
    default: 0
  },
  legbyeRuns: {
    type: Number,
    default: 0
  },
  noballRuns: {
    type: Number,
    default: 0
  },
  penaltyRuns: {
    type: Number,
    default: 0
  },
  batsmanRuns: {
    type: Number,
    default: 0
  },
  extraRuns: {
    type: Number,
    default: 0
  },
  totalRuns: {
    type: Number,
    default: 0
  },
  player_dismissed: {
    type: String,
    default: null
  },
  dismissal_kind: {
    type: String,
    default: null
  },
  dismissal_fielders: {
    type: String,
    default: null
  },
  // Keep legacy fields for backward compatibility
  batting_team: {
    type: String,
    required: false
  },
  bowling_team: {
    type: String,
    required: false
  },
  non_striker: {
    type: String,
    required: false
  },
  is_super_over: {
    type: Number,
    default: 0
  },
  wide_runs: {
    type: Number,
    default: 0
  },
  bye_runs: {
    type: Number,
    default: 0
  },
  legbye_runs: {
    type: Number,
    default: 0
  },
  noball_runs: {
    type: Number,
    default: 0
  },
  penalty_runs: {
    type: Number,
    default: 0
  },
  batsman_runs: {
    type: Number,
    default: 0
  },
  extra_runs: {
    type: Number,
    default: 0
  },
  total_runs: {
    type: Number,
    default: 0
  },
  fielder: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for better query performance
deliverySchema.index({ matchId: 1, inning: 1, over: 1, ball: 1 });
deliverySchema.index({ match_id: 1, inning: 1, over: 1, ball: 1 }); // Legacy compatibility
deliverySchema.index({ batsman: 1 });
deliverySchema.index({ bowler: 1 });
deliverySchema.index({ battingTeam: 1 });
deliverySchema.index({ batting_team: 1 }); // Legacy compatibility

module.exports = mongoose.model('Delivery', deliverySchema);
