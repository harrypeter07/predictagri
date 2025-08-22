-- PredictAgri Database Schema Migration
-- Run this in Supabase SQL Editor

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS crops CASCADE;
DROP TABLE IF EXISTS regions CASCADE;

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
    user_id TEXT, -- Changed from UUID REFERENCES auth.users(id) to TEXT for demo purposes
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

-- Insert sample regions (8 regions total)
INSERT INTO regions (name, lat, lon, soil_n, soil_p, soil_k, ph) VALUES
('Punjab Region', 30.3753, 69.3451, 45, 30, 25, 6.5),
('Haryana Plains', 29.0588, 76.0856, 50, 35, 30, 7.2),
('Uttar Pradesh Central', 26.8467, 80.9462, 40, 25, 20, 6.8),
('Maharashtra Western', 19.0760, 72.8777, 35, 20, 15, 5.9),
('Karnataka Southern', 12.9716, 77.5946, 55, 40, 35, 7.5),
('Tamil Nadu Coastal', 13.0827, 80.2707, 42, 28, 22, 6.2),
('Gujarat Western', 23.0225, 72.5714, 38, 22, 18, 7.8),
('Rajasthan Northern', 26.9124, 75.7873, 32, 18, 12, 8.1);

-- Insert sample crops (12 crops total)
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

-- 5. Weather Data table for historical tracking
CREATE TABLE weather_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id UUID REFERENCES regions(id),
    lat FLOAT8 NOT NULL,
    lon FLOAT8 NOT NULL,
    weather_data JSONB NOT NULL, -- store complete weather response
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Satellite Data table for historical tracking
CREATE TABLE satellite_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id UUID REFERENCES regions(id),
    data_type TEXT NOT NULL, -- ndvi, temperature, soil-moisture, etc.
    satellite_data JSONB NOT NULL, -- store complete satellite data
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Image Analysis Results table
CREATE TABLE image_analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id UUID REFERENCES regions(id),
    crop_id UUID REFERENCES crops(id),
    analysis_type TEXT NOT NULL, -- comprehensive, crop-health, disease-detection, etc.
    analysis_result JSONB NOT NULL, -- store complete analysis results
    image_metadata JSONB, -- store file info, size, type
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Farmer Analysis Results table (NEW)
CREATE TABLE farmer_analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id TEXT NOT NULL, -- farmer identifier
    phone_number TEXT NOT NULL, -- farmer's phone number
    region_id UUID REFERENCES regions(id),
    crop_id UUID REFERENCES crops(id),
    analysis_type TEXT NOT NULL, -- 'enhanced_pipeline', 'basic_pipeline', 'image_analysis'
    pipeline_id TEXT NOT NULL, -- unique pipeline identifier
    insights JSONB NOT NULL, -- store all insights
    predictions JSONB NOT NULL, -- store all predictions
    data_collection JSONB NOT NULL, -- store weather, environmental, satellite data
    alerts JSONB, -- store generated alerts
    recommendations JSONB, -- store recommendations
    notification_sent BOOLEAN DEFAULT FALSE, -- track if notification was sent
    notification_sent_at TIMESTAMP WITH TIME ZONE, -- when notification was sent
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_predictions_user_id ON predictions(user_id);
CREATE INDEX idx_predictions_crop_id ON predictions(crop_id);
CREATE INDEX idx_predictions_region_id ON predictions(region_id);
CREATE INDEX idx_predictions_created_at ON predictions(created_at);
CREATE INDEX idx_alerts_prediction_id ON alerts(prediction_id);
CREATE INDEX idx_regions_location ON regions(lat, lon);

-- Indexes for new tables
CREATE INDEX idx_weather_data_region_id ON weather_data(region_id);
CREATE INDEX idx_weather_data_timestamp ON weather_data(timestamp);
CREATE INDEX idx_weather_data_location ON weather_data(lat, lon);
CREATE INDEX idx_satellite_data_region_id ON satellite_data(region_id);
CREATE INDEX idx_satellite_data_type ON satellite_data(data_type);
CREATE INDEX idx_satellite_data_timestamp ON satellite_data(timestamp);
CREATE INDEX idx_image_analysis_region_id ON image_analysis_results(region_id);
CREATE INDEX idx_image_analysis_crop_id ON image_analysis_results(crop_id);
CREATE INDEX idx_image_analysis_type ON image_analysis_results(analysis_type);
CREATE INDEX idx_image_analysis_timestamp ON image_analysis_results(timestamp);

-- Indexes for farmer analysis results
CREATE INDEX idx_farmer_analysis_farmer_id ON farmer_analysis_results(farmer_id);
CREATE INDEX idx_farmer_analysis_phone_number ON farmer_analysis_results(phone_number);
CREATE INDEX idx_farmer_analysis_region_id ON farmer_analysis_results(region_id);
CREATE INDEX idx_farmer_analysis_crop_id ON farmer_analysis_results(crop_id);
CREATE INDEX idx_farmer_analysis_pipeline_id ON farmer_analysis_results(pipeline_id);
CREATE INDEX idx_farmer_analysis_created_at ON farmer_analysis_results(created_at);
CREATE INDEX idx_farmer_analysis_notification_sent ON farmer_analysis_results(notification_sent);

-- Add Row Level Security (RLS) policies for better security
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE satellite_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_analysis_results ENABLE ROW LEVEL SECURITY;

-- Allow public read access to regions and crops (for dropdowns)
CREATE POLICY "Allow public read access to regions" ON regions FOR SELECT USING (true);
CREATE POLICY "Allow public read access to crops" ON crops FOR SELECT USING (true);

-- Allow public access to predictions (for the app to work without auth)
CREATE POLICY "Allow public insert to predictions" ON predictions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access to predictions" ON predictions FOR SELECT USING (true);

-- Allow public access to weather, satellite, and image analysis data
CREATE POLICY "Allow public insert to weather_data" ON weather_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access to weather_data" ON weather_data FOR SELECT USING (true);
CREATE POLICY "Allow public insert to satellite_data" ON satellite_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access to satellite_data" ON satellite_data FOR SELECT USING (true);
CREATE POLICY "Allow public insert to image_analysis_results" ON image_analysis_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access to image_analysis_results" ON image_analysis_results FOR SELECT USING (true);

-- Allow public access to alerts (for the app to work without auth)
CREATE POLICY "Allow public insert to alerts" ON alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access to alerts" ON alerts FOR SELECT USING (true);

-- Allow public access to farmer analysis results
CREATE POLICY "Allow public insert to farmer_analysis_results" ON farmer_analysis_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access to farmer_analysis_results" ON farmer_analysis_results FOR SELECT USING (true);
CREATE POLICY "Allow public update to farmer_analysis_results" ON farmer_analysis_results FOR UPDATE USING (true);
