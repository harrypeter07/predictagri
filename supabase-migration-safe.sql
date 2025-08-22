-- PredictAgri Database Schema Migration (Safe Version)
-- Run this in Supabase SQL Editor to avoid duplicate index errors

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to safely create indexes
CREATE OR REPLACE FUNCTION create_index_if_not_exists(index_name TEXT, table_name TEXT, columns TEXT)
RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = index_name
    ) THEN
        EXECUTE format('CREATE INDEX %I ON %I (%s)', index_name, table_name, columns);
        RAISE NOTICE 'Created index: %', index_name;
    ELSE
        RAISE NOTICE 'Index already exists: %', index_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create tables only if they don't exist
CREATE TABLE IF NOT EXISTS regions (
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

CREATE TABLE IF NOT EXISTS crops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    season TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT, -- Changed from UUID REFERENCES auth.users(id) to TEXT for demo purposes
    crop_id UUID REFERENCES crops(id) NOT NULL,
    region_id UUID REFERENCES regions(id) NOT NULL,
    features JSONB NOT NULL, -- store input features
    yield NUMERIC NOT NULL, -- predicted yield
    risk_score NUMERIC NOT NULL, -- risk probability
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prediction_id UUID REFERENCES predictions(id) NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weather_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id UUID REFERENCES regions(id),
    lat FLOAT8 NOT NULL,
    lon FLOAT8 NOT NULL,
    weather_data JSONB NOT NULL, -- store complete weather response
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS satellite_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id UUID REFERENCES regions(id),
    data_type TEXT NOT NULL, -- ndvi, temperature, soil-moisture, etc.
    satellite_data JSONB NOT NULL, -- store complete satellite data
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS image_analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id UUID REFERENCES regions(id),
    crop_id UUID REFERENCES crops(id),
    analysis_type TEXT NOT NULL, -- comprehensive, crop-health, disease-detection, etc.
    analysis_result JSONB NOT NULL, -- store complete analysis results
    image_metadata JSONB, -- store file info, size, type
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS farmer_analysis_results (
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

-- Insert sample data only if tables are empty
INSERT INTO regions (name, lat, lon, soil_n, soil_p, soil_k, ph)
SELECT * FROM (VALUES
    ('Punjab Region', 30.3753, 69.3451, 45, 30, 25, 6.5),
    ('Haryana Plains', 29.0588, 76.0856, 50, 35, 30, 7.2),
    ('Uttar Pradesh Central', 26.8467, 80.9462, 40, 25, 20, 6.8),
    ('Maharashtra Western', 19.0760, 72.8777, 35, 20, 15, 5.9),
    ('Karnataka Southern', 12.9716, 77.5946, 55, 40, 35, 7.5),
    ('Tamil Nadu Coastal', 13.0827, 80.2707, 42, 28, 22, 6.2),
    ('Gujarat Western', 23.0225, 72.5714, 38, 22, 18, 7.8),
    ('Rajasthan Northern', 26.9124, 75.7873, 32, 18, 12, 8.1)
) AS v(name, lat, lon, soil_n, soil_p, soil_k, ph)
WHERE NOT EXISTS (SELECT 1 FROM regions LIMIT 1);

INSERT INTO crops (name, season)
SELECT * FROM (VALUES
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
    ('Sunflower', 'Rabi')
) AS v(name, season)
WHERE NOT EXISTS (SELECT 1 FROM crops LIMIT 1);

-- Safely create indexes
SELECT create_index_if_not_exists('idx_predictions_user_id', 'predictions', 'user_id');
SELECT create_index_if_not_exists('idx_predictions_crop_id', 'predictions', 'crop_id');
SELECT create_index_if_not_exists('idx_predictions_region_id', 'predictions', 'region_id');
SELECT create_index_if_not_exists('idx_predictions_created_at', 'predictions', 'created_at');
SELECT create_index_if_not_exists('idx_alerts_prediction_id', 'alerts', 'prediction_id');
SELECT create_index_if_not_exists('idx_regions_location', 'regions', 'lat, lon');

-- Indexes for new tables
SELECT create_index_if_not_exists('idx_weather_data_region_id', 'weather_data', 'region_id');
SELECT create_index_if_not_exists('idx_weather_data_timestamp', 'weather_data', 'timestamp');
SELECT create_index_if_not_exists('idx_weather_data_location', 'weather_data', 'lat, lon');
SELECT create_index_if_not_exists('idx_satellite_data_region_id', 'satellite_data', 'region_id');
SELECT create_index_if_not_exists('idx_satellite_data_type', 'satellite_data', 'data_type');
SELECT create_index_if_not_exists('idx_satellite_data_timestamp', 'satellite_data', 'timestamp');
SELECT create_index_if_not_exists('idx_image_analysis_region_id', 'image_analysis_results', 'region_id');
SELECT create_index_if_not_exists('idx_image_analysis_crop_id', 'image_analysis_results', 'crop_id');
SELECT create_index_if_not_exists('idx_image_analysis_type', 'image_analysis_results', 'analysis_type');
SELECT create_index_if_not_exists('idx_image_analysis_timestamp', 'image_analysis_results', 'timestamp');

-- Indexes for farmer analysis results
SELECT create_index_if_not_exists('idx_farmer_analysis_farmer_id', 'farmer_analysis_results', 'farmer_id');
SELECT create_index_if_not_exists('idx_farmer_analysis_phone_number', 'farmer_analysis_results', 'phone_number');
SELECT create_index_if_not_exists('idx_farmer_analysis_region_id', 'farmer_analysis_results', 'region_id');
SELECT create_index_if_not_exists('idx_farmer_analysis_crop_id', 'farmer_analysis_results', 'crop_id');
SELECT create_index_if_not_exists('idx_farmer_analysis_pipeline_id', 'farmer_analysis_results', 'pipeline_id');
SELECT create_index_if_not_exists('idx_farmer_analysis_created_at', 'farmer_analysis_results', 'created_at');
SELECT create_index_if_not_exists('idx_farmer_analysis_notification_sent', 'farmer_analysis_results', 'notification_sent');

-- Enable Row Level Security (RLS) policies
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE satellite_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_analysis_results ENABLE ROW LEVEL SECURITY;

-- Create policies only if they don't exist
DO $$
BEGIN
    -- Regions policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'regions' AND policyname = 'Allow public read access to regions') THEN
        CREATE POLICY "Allow public read access to regions" ON regions FOR SELECT USING (true);
    END IF;
    
    -- Crops policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crops' AND policyname = 'Allow public read access to crops') THEN
        CREATE POLICY "Allow public read access to crops" ON crops FOR SELECT USING (true);
    END IF;
    
    -- Predictions policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'predictions' AND policyname = 'Allow public insert to predictions') THEN
        CREATE POLICY "Allow public insert to predictions" ON predictions FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'predictions' AND policyname = 'Allow public read access to predictions') THEN
        CREATE POLICY "Allow public read access to predictions" ON predictions FOR SELECT USING (true);
    END IF;
    
    -- Weather data policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weather_data' AND policyname = 'Allow public insert to weather_data') THEN
        CREATE POLICY "Allow public insert to weather_data" ON weather_data FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weather_data' AND policyname = 'Allow public read access to weather_data') THEN
        CREATE POLICY "Allow public read access to weather_data" ON weather_data FOR SELECT USING (true);
    END IF;
    
    -- Satellite data policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'satellite_data' AND policyname = 'Allow public insert to satellite_data') THEN
        CREATE POLICY "Allow public insert to satellite_data" ON satellite_data FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'satellite_data' AND policyname = 'Allow public read access to satellite_data') THEN
        CREATE POLICY "Allow public read access to satellite_data" ON satellite_data FOR SELECT USING (true);
    END IF;
    
    -- Image analysis policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'image_analysis_results' AND policyname = 'Allow public insert to image_analysis_results') THEN
        CREATE POLICY "Allow public insert to image_analysis_results" ON image_analysis_results FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'image_analysis_results' AND policyname = 'Allow public read access to image_analysis_results') THEN
        CREATE POLICY "Allow public read access to image_analysis_results" ON image_analysis_results FOR SELECT USING (true);
    END IF;
    
    -- Alerts policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'alerts' AND policyname = 'Allow public insert to alerts') THEN
        CREATE POLICY "Allow public insert to alerts" ON alerts FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'alerts' AND policyname = 'Allow public read access to alerts') THEN
        CREATE POLICY "Allow public read access to alerts" ON alerts FOR SELECT USING (true);
    END IF;
    
    -- Farmer analysis policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'farmer_analysis_results' AND policyname = 'Allow public insert to farmer_analysis_results') THEN
        CREATE POLICY "Allow public insert to farmer_analysis_results" ON farmer_analysis_results FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'farmer_analysis_results' AND policyname = 'Allow public read access to farmer_analysis_results') THEN
        CREATE POLICY "Allow public read access to farmer_analysis_results" ON farmer_analysis_results FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'farmer_analysis_results' AND policyname = 'Allow public update to farmer_analysis_results') THEN
        CREATE POLICY "Allow public update to farmer_analysis_results" ON farmer_analysis_results FOR UPDATE USING (true);
    END IF;
END $$;

-- Clean up the helper function
DROP FUNCTION IF EXISTS create_index_if_not_exists(TEXT, TEXT, TEXT);

-- Success message
SELECT 'Migration completed successfully! All tables, indexes, and policies have been created safely.' as status;
