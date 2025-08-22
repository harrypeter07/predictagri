-- Check existing indexes in the database
-- Run this in Supabase SQL Editor to see what indexes already exist

-- Check all indexes for our tables
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN (
    'regions', 
    'crops', 
    'predictions', 
    'alerts', 
    'weather_data', 
    'satellite_data', 
    'image_analysis_results', 
    'farmer_analysis_results'
)
ORDER BY tablename, indexname;

-- Check specifically for the problematic index
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE indexname = 'idx_predictions_user_id';

-- Check if tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'regions', 
    'crops', 
    'predictions', 
    'alerts', 
    'weather_data', 
    'satellite_data', 
    'image_analysis_results', 
    'farmer_analysis_results'
)
ORDER BY table_name;

-- Check table row counts
SELECT 
    'regions' as table_name,
    COUNT(*) as row_count
FROM regions
UNION ALL
SELECT 
    'crops' as table_name,
    COUNT(*) as row_count
FROM crops
UNION ALL
SELECT 
    'predictions' as table_name,
    COUNT(*) as row_count
FROM predictions
UNION ALL
SELECT 
    'alerts' as table_name,
    COUNT(*) as row_count
FROM alerts
UNION ALL
SELECT 
    'weather_data' as table_name,
    COUNT(*) as row_count
FROM weather_data
UNION ALL
SELECT 
    'satellite_data' as table_name,
    COUNT(*) as row_count
FROM satellite_data
UNION ALL
SELECT 
    'image_analysis_results' as table_name,
    COUNT(*) as row_count
FROM image_analysis_results
UNION ALL
SELECT 
    'farmer_analysis_results' as table_name,
    COUNT(*) as row_count
FROM farmer_analysis_results;
