// Phase constants for IPL cricket analysis
// Used by analytics controllers to categorize overs into phases

const PHASES = {
  POWERPLAY: {
    name: 'POWERPLAY',
    startOver: 1,
    endOver: 6
  },
  MIDDLE: {
    name: 'MIDDLE', 
    startOver: 7,
    endOver: 15
  },
  DEATH: {
    name: 'DEATH',
    startOver: 16,
    endOver: 20
  }
};

// Helper function to determine phase from over number
const getPhaseFromOver = (over) => {
  if (over >= 1 && over <= 6) return PHASES.POWERPLAY.name;
  if (over >= 7 && over <= 15) return PHASES.MIDDLE.name;
  if (over >= 16 && over <= 20) return PHASES.DEATH.name;
  return null;
};

module.exports = {
  PHASES,
  getPhaseFromOver
};
