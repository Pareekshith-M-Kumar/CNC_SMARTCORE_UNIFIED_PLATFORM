// Empirical Dataset Benchmark Data (AI4I 2020 Predictive Maintenance & NASA Milling Dataset)
// Used for training failure_model.pkl, health_model.pkl, and tool_wear_model.pkl

export const AI4I_DATASET_META = {
  name: 'UCI AI4I 2020 Predictive Maintenance & NASA Milling Dataset',
  citation: 'Matzka (2020) & Agogino/Goebel (2007) NASA Ames Research Center',
  totalTrainedSamples: '10,167 benchmark records',
  models: [
    { name: 'failure_model.pkl', algorithm: 'RandomForestClassifier (n=50, d=6)', target: 'Machine Failure (TWF/HDF/PWF/OSF)' },
    { name: 'health_model.pkl', algorithm: 'RandomForestRegressor (n=50, d=6)', target: 'Health Index (0 - 100%)' },
    { name: 'tool_wear_model.pkl', algorithm: 'RandomForestRegressor (n=50, d=5)', target: 'Flank Wear VB (µm / % life)' },
  ],
};

export const AI4I_SAMPLES = [
  { udi: 14, productId: 'L47193', type: 'L', airTempK: 298.6, processTempK: 309.2, rotationalSpeedRpm: 1306, torqueNm: 65.8, toolWearMin: 34, failureMode: 'None', failureProb: 0.04, healthScore: 94.2 },
  { udi: 51, productId: 'L47230', type: 'L', airTempK: 298.9, processTempK: 309.1, rotationalSpeedRpm: 2861, torqueNm: 4.6, toolWearMin: 143, failureMode: 'PWF (Power Failure)', failureProb: 0.88, healthScore: 42.0 },
  { udi: 78, productId: 'M14937', type: 'M', airTempK: 298.8, processTempK: 308.9, rotationalSpeedRpm: 1412, torqueNm: 52.3, toolWearMin: 218, failureMode: 'TWF (Tool Wear Failure)', failureProb: 0.94, healthScore: 31.5 },
  { udi: 161, productId: 'L47340', type: 'L', airTempK: 298.3, processTempK: 308.1, rotationalSpeedRpm: 1409, torqueNm: 46.2, toolWearMin: 17, failureMode: 'None', failureProb: 0.02, healthScore: 96.8 },
  { udi: 195, productId: 'M15054', type: 'M', airTempK: 298.4, processTempK: 308.2, rotationalSpeedRpm: 1680, torqueNm: 33.7, toolWearMin: 105, failureMode: 'None', failureProb: 0.12, healthScore: 88.0 },
  { udi: 320, productId: 'H39740', type: 'H', airTempK: 300.2, processTempK: 310.8, rotationalSpeedRpm: 1324, torqueNm: 68.2, toolWearMin: 192, failureMode: 'OSF (Overstrain Failure)', failureProb: 0.81, healthScore: 38.0 },
  { udi: 482, productId: 'L47661', type: 'L', airTempK: 303.1, processTempK: 312.4, rotationalSpeedRpm: 1280, torqueNm: 62.1, toolWearMin: 85, failureMode: 'HDF (Heat Dissipation Failure)', failureProb: 0.74, healthScore: 48.6 },
  { udi: 605, productId: 'M15464', type: 'M', airTempK: 301.5, processTempK: 311.0, rotationalSpeedRpm: 1520, torqueNm: 38.5, toolWearMin: 54, failureMode: 'None', failureProb: 0.06, healthScore: 92.4 }
];

export const NASA_MILLING_SAMPLES = [
  { caseNo: 1, cutSpeed: 200, feedRate: 0.25, doc: 1.5, material: 'Cast Iron', flankWearVb: '0.08 mm', category: 'Initial Wear', status: 'Healthy' },
  { caseNo: 4, cutSpeed: 200, feedRate: 0.50, doc: 1.5, material: 'Cast Iron', flankWearVb: '0.24 mm', category: 'Steady Wear', status: 'Acceptable' },
  { caseNo: 9, cutSpeed: 300, feedRate: 0.25, doc: 0.75, material: 'Steel J434c', flankWearVb: '0.46 mm', category: 'Accelerated Wear', status: 'Warning' },
  { caseNo: 14, cutSpeed: 300, feedRate: 0.50, doc: 1.5, material: 'Steel J434c', flankWearVb: '0.79 mm', category: 'Catastrophic Wear', status: 'Critical' }
];
