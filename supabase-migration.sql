-- PredictAgri Database Schema Migration
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Regions table
CREATE TABLE regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    lat FLOAT8 NOT NULL,
    lon FLOAT8 NOT NULL,
    soil_n INTEGER NOT NULL, -- Nitrogen
    soil_p INTEGER NOT NULL, -- Phosphorus
    soil_k INTEGER NOT NULL, -- Potassium
    ph FLOAT8 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crops table
CREATE TABLE crops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    season TEXT NOT NULL
);

-- 3. Predictions table
CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    crop_id UUID REFERENCES crops(id) NOT NULL,
    region_id UUID REFERENCES regions(id) NOT NULL,
    features JSONB NOT NULL, -- store input features
    yield NUMERIC NOT NULL, -- predicted yield
    risk_score NUMERIC NOT NULL, -- risk probability
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Alerts table
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prediction_id UUID REFERENCES predictions(id) NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert ALL sample regions from mockData.js (8 regions total)
INSERT INTO regions (name, lat, lon, soil_n, soil_p, soil_k, ph) VALUES
('Punjab Region', 30.3753, 69.3451, 45, 30, 25, 6.5),
('Haryana Plains', 29.0588, 76.0856, 50, 35, 30, 7.2),
('Uttar Pradesh Central', 26.8467, 80.9462, 40, 25, 20, 6.8),
('Maharashtra Western', 19.0760, 72.8777, 35, 20, 15, 5.9),
('Karnataka Southern', 12.9716, 77.5946, 55, 40, 35, 7.5),
('Tamil Nadu Coastal', 13.0827, 80.2707, 42, 28, 22, 6.2),
('Gujarat Western', 23.0225, 72.5714, 38, 22, 18, 7.8),
('Rajasthan Northern', 26.9124, 75.7873, 32, 18, 12, 8.1);

-- Insert ALL sample crops from mockData.js (12 crops total)
INSERT INTO crops (name, season) VALUES
('Wheat', 'Rabi'),
('Rice', 'Kharif'),
('Maize', 'Kharif'),
('Cotton', 'Kharif'),
('Sugarcane', 'Year-round'),
('Potato', 'Rabi'),
('Tomato', 'Year-round'),
('Onion', 'Rabi'),
('Chickpea', 'Rabi'),
('Soybean', 'Kharif'),
('Groundnut', 'Kharif'),
('Sunflower', 'Rabi');

-- Create indexes for better performance
CREATE INDEX idx_predictions_user_id ON predictions(user_id);
CREATE INDEX idx_predictions_crop_id ON predictions(crop_id);
CREATE INDEX idx_predictions_region_id ON predictions(region_id);
CREATE INDEX idx_predictions_created_at ON predictions(created_at);
CREATE INDEX idx_alerts_prediction_id ON alerts(prediction_id);
CREATE INDEX idx_regions_location ON regions(lat, lon);

-- Add Row Level Security (RLS) policies for better security
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Allow public read access to regions and crops (for dropdowns)
CREATE POLICY "Allow public read access to regions" ON regions FOR SELECT USING (true);
CREATE POLICY "Allow public read access to crops" ON crops FOR SELECT USING (true);

-- Allow public access to predictions (for the app to work without auth)
CREATE POLICY "Allow public insert to predictions" ON predictions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access to predictions" ON predictions FOR SELECT USING (true);

-- Allow public access to alerts (for the app to work without auth)
CREATE POLICY "Allow public insert to alerts" ON alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access to alerts" ON alerts FOR SELECT USING (true);
