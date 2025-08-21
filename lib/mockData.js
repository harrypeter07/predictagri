// Mock data utilities for PredictAgri testing

export const mockRegions = [
  {
    name: 'Punjab Region',
    lat: 30.3753,
    lon: 69.3451,
    soil_n: 45,
    soil_p: 30,
    soil_k: 25,
    ph: 6.5
  },
  {
    name: 'Haryana Plains',
    lat: 29.0588,
    lon: 76.0856,
    soil_n: 50,
    soil_p: 35,
    soil_k: 30,
    ph: 7.2
  },
  {
    name: 'Uttar Pradesh Central',
    lat: 26.8467,
    lon: 80.9462,
    soil_n: 40,
    soil_p: 25,
    soil_k: 20,
    ph: 6.8
  },
  {
    name: 'Maharashtra Western',
    lat: 19.0760,
    lon: 72.8777,
    soil_n: 35,
    soil_p: 20,
    soil_k: 15,
    ph: 5.9
  },
  {
    name: 'Karnataka Southern',
    lat: 12.9716,
    lon: 77.5946,
    soil_n: 55,
    soil_p: 40,
    soil_k: 35,
    ph: 7.5
  },
  {
    name: 'Tamil Nadu Coastal',
    lat: 13.0827,
    lon: 80.2707,
    soil_n: 42,
    soil_p: 28,
    soil_k: 22,
    ph: 6.2
  },
  {
    name: 'Gujarat Western',
    lat: 23.0225,
    lon: 72.5714,
    soil_n: 38,
    soil_p: 22,
    soil_k: 18,
    ph: 7.8
  },
  {
    name: 'Rajasthan Northern',
    lat: 26.9124,
    lon: 75.7873,
    soil_n: 32,
    soil_p: 18,
    soil_k: 12,
    ph: 8.1
  }
]

export const mockCrops = [
  { name: 'Wheat', season: 'Rabi' },
  { name: 'Rice', season: 'Kharif' },
  { name: 'Maize', season: 'Kharif' },
  { name: 'Cotton', season: 'Kharif' },
  { name: 'Sugarcane', season: 'Year-round' },
  { name: 'Potato', season: 'Rabi' },
  { name: 'Tomato', season: 'Year-round' },
  { name: 'Onion', season: 'Rabi' },
  { name: 'Chickpea', season: 'Rabi' },
  { name: 'Soybean', season: 'Kharif' },
  { name: 'Groundnut', season: 'Kharif' },
  { name: 'Sunflower', season: 'Rabi' }
]

export const generateMockFeatures = () => ({
  temperature: Math.random() * 20 + 15, // 15-35°C
  humidity: Math.random() * 40 + 40, // 40-80%
  rainfall: Math.random() * 200 + 50, // 50-250mm
  soil_moisture: Math.random() * 0.4 + 0.3, // 0.3-0.7
  nitrogen: Math.floor(Math.random() * 40) + 20, // 20-60
  phosphorus: Math.floor(Math.random() * 30) + 15, // 15-45
  potassium: Math.floor(Math.random() * 25) + 10, // 10-35
  ph: Math.random() * 3 + 5.5, // 5.5-8.5
  wind_speed: Math.random() * 15 + 5, // 5-20 km/h
  solar_radiation: Math.random() * 8 + 4, // 4-12 kWh/m²
  evapotranspiration: Math.random() * 5 + 2, // 2-7 mm/day
  crop_age: Math.floor(Math.random() * 120) + 30 // 30-150 days
})

export const generateMockPrediction = (cropId, regionId) => {
  const features = generateMockFeatures()
  
  // Generate more realistic yield based on features
  let baseYield = 50
  if (features.temperature > 20 && features.temperature < 30) baseYield += 20
  if (features.humidity > 50 && features.humidity < 70) baseYield += 15
  if (features.nitrogen > 30) baseYield += 10
  if (features.ph > 6 && features.ph < 7.5) baseYield += 10
  
  const yield_prediction = baseYield + Math.random() * 30
  
  // Generate risk score based on adverse conditions
  let riskFactors = 0
  if (features.temperature > 35 || features.temperature < 10) riskFactors += 0.3
  if (features.humidity > 80 || features.humidity < 30) riskFactors += 0.2
  if (features.rainfall > 300 || features.rainfall < 30) riskFactors += 0.2
  if (features.nitrogen < 25) riskFactors += 0.15
  if (features.ph < 5.5 || features.ph > 8.5) riskFactors += 0.15
  
  const risk_score = Math.min(0.8, riskFactors + Math.random() * 0.2)
  
  return {
    cropId,
    regionId,
    features,
    yield: Math.round(yield_prediction * 100) / 100,
    risk_score: Math.round(risk_score * 1000) / 1000
  }
}

export const mockUsers = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'John Farmer',
    email: 'john@example.com',
    region: 'Punjab'
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Sarah Agriculturist',
    email: 'sarah@example.com',
    region: 'Haryana'
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174002',
    name: 'Mike Cultivator',
    email: 'mike@example.com',
    region: 'Uttar Pradesh'
  }
]

export const generateMockAlert = (predictionId, riskScore) => {
  const alertTypes = ['weather', 'soil', 'disease', 'pest', 'irrigation']
  const type = alertTypes[Math.floor(Math.random() * alertTypes.length)]
  
  const messages = {
    weather: [
      'High temperature alert: Consider additional irrigation',
      'Low humidity detected: Monitor crop stress',
      'Heavy rainfall expected: Prepare drainage systems'
    ],
    soil: [
      'Soil pH levels are suboptimal for current crop',
      'Nitrogen deficiency detected: Consider fertilization',
      'Soil moisture levels are low: Increase irrigation'
    ],
    disease: [
      'Fungal disease risk high due to humidity',
      'Bacterial infection possible: Monitor closely',
      'Viral disease symptoms detected in nearby fields'
    ],
    pest: [
      'Pest infestation risk increased',
      'Aphid population detected: Consider pest control',
      'Caterpillar activity observed: Monitor damage'
    ],
    irrigation: [
      'Irrigation schedule needs adjustment',
      'Water stress detected: Increase irrigation frequency',
      'Over-irrigation risk: Reduce water application'
    ]
  }
  
  const message = messages[type][Math.floor(Math.random() * messages[type].length)]
  
  return {
    predictionId,
    type,
    message,
    severity: riskScore > 0.5 ? 'high' : riskScore > 0.3 ? 'medium' : 'low'
  }
}
