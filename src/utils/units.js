// Weights are always stored in kg; profile.units only changes display/input.
const KG_PER_LB = 0.453592;

export const UNIT_OPTIONS = [
  { id: 'metric',   label: 'Metric',   weight: 'kg' },
  { id: 'imperial', label: 'Imperial', weight: 'lbs' },
];

export const weightUnit = units => (units === 'imperial' ? 'lbs' : 'kg');

export const kgToDisplay = (kg, units) =>
  Math.round((units === 'imperial' ? kg / KG_PER_LB : kg) * 10) / 10;

export const displayToKg = (value, units) =>
  Math.round((units === 'imperial' ? value * KG_PER_LB : value) * 100) / 100;
