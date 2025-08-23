// Test script to verify visualizations with real data
import fetch from 'node-fetch';

async function testVisualizations() {
  console.log('🧪 Testing Visualizations with Real Data...\n');
  
  try {
    // Test all APIs to get real data
    console.log('📊 Fetching real data from APIs...');
    
    const [cropsRes, regionsRes, predictionsRes] = await Promise.all([
      fetch('http://localhost:3001/api/crops'),
      fetch('http://localhost:3001/api/regions'),
      fetch('http://localhost:3001/api/predictions')
    ]);
    
    const crops = await cropsRes.json();
    const regions = await regionsRes.json();
    const predictions = await predictionsRes.json();
    
    console.log(`✅ Data fetched successfully:`);
    console.log(`   🌾 Crops: ${crops.length} items`);
    console.log(`   📍 Regions: ${regions.length} items`);
    console.log(`   📈 Predictions: ${predictions.length} items`);
    
    // Test chart data processing
    console.log('\n📊 Testing Chart Data Processing...');
    
    // Test YieldTrendChart data
    const yieldData = predictions && Array.isArray(predictions) && predictions.length > 0 ? predictions : [];
    console.log(`   📈 YieldTrendChart: ${yieldData.length} data points`);
    
    // Test RegionalPerformanceChart data
    const regionData = regions && Array.isArray(regions) && regions.length > 0 ? regions : [];
    const regionPredictions = predictions && Array.isArray(predictions) && predictions.length > 0 ? predictions : [];
    console.log(`   🌍 RegionalPerformanceChart: ${regionData.length} regions, ${regionPredictions.length} predictions`);
    
    // Test CropDistributionChart data
    const cropData = crops && Array.isArray(crops) && crops.length > 0 ? crops : [];
    const cropPredictions = predictions && Array.isArray(predictions) && predictions.length > 0 ? predictions : [];
    console.log(`   🌾 CropDistributionChart: ${cropData.length} crops, ${cropPredictions.length} predictions`);
    
    // Test SoilHealthChart data
    const soilData = predictions && Array.isArray(predictions) && predictions.length > 0 ? predictions : [];
    console.log(`   🌱 SoilHealthChart: ${soilData.length} soil data points`);
    
    // Test WeatherImpactChart data
    const weatherData = predictions && Array.isArray(predictions) && predictions.length > 0 ? predictions : [];
    console.log(`   🌤️ WeatherImpactChart: ${weatherData.length} weather data points`);
    
    // Test CropPerformanceChart data
    console.log(`   🌾 CropPerformanceChart: ${cropData.length} crops, ${cropPredictions.length} predictions`);
    
    // Test SeasonalAnalysisChart data
    console.log(`   📅 SeasonalAnalysisChart: ${cropData.length} crops, ${cropPredictions.length} predictions`);
    
    // Sample data analysis
    console.log('\n🔍 Sample Data Analysis:');
    
    if (predictions.length > 0) {
      const samplePrediction = predictions[0];
      console.log(`   📊 Sample Prediction:`);
      console.log(`      Yield: ${samplePrediction.yield || 'N/A'}`);
      console.log(`      Risk Score: ${samplePrediction.risk_score || 'N/A'}`);
      console.log(`      Created: ${samplePrediction.created_at || 'N/A'}`);
      console.log(`      Features: ${samplePrediction.features ? Object.keys(samplePrediction.features).length : 0} properties`);
    }
    
    if (crops.length > 0) {
      const sampleCrop = crops[0];
      console.log(`   🌾 Sample Crop: ${sampleCrop.name} (${sampleCrop.season})`);
    }
    
    if (regions.length > 0) {
      const sampleRegion = regions[0];
      console.log(`   📍 Sample Region: ${sampleRegion.name} (${sampleRegion.lat}, ${sampleRegion.lon})`);
    }
    
    // Visualization readiness assessment
    console.log('\n📊 Visualization Readiness Assessment:');
    
    const assessments = [
      {
        name: 'YieldTrendChart',
        ready: yieldData.length > 0,
        dataPoints: yieldData.length,
        description: 'Shows yield trends over time'
      },
      {
        name: 'RegionalPerformanceChart',
        ready: regionData.length > 0 && regionPredictions.length > 0,
        dataPoints: regionPredictions.length,
        description: 'Shows regional performance analysis'
      },
      {
        name: 'CropDistributionChart',
        ready: cropData.length > 0 && cropPredictions.length > 0,
        dataPoints: cropPredictions.length,
        description: 'Shows crop distribution analysis'
      },
      {
        name: 'SoilHealthChart',
        ready: soilData.length > 0,
        dataPoints: soilData.length,
        description: 'Shows soil health analysis'
      },
      {
        name: 'WeatherImpactChart',
        ready: weatherData.length > 0,
        dataPoints: weatherData.length,
        description: 'Shows weather impact analysis'
      },
      {
        name: 'CropPerformanceChart',
        ready: cropData.length > 0 && cropPredictions.length > 0,
        dataPoints: cropPredictions.length,
        description: 'Shows crop performance comparison'
      },
      {
        name: 'SeasonalAnalysisChart',
        ready: cropData.length > 0 && cropPredictions.length > 0,
        dataPoints: cropPredictions.length,
        description: 'Shows seasonal performance analysis'
      }
    ];
    
    assessments.forEach(assessment => {
      const status = assessment.ready ? '✅' : '❌';
      const statusText = assessment.ready ? 'Ready' : 'Needs Data';
      console.log(`   ${status} ${assessment.name}: ${statusText} (${assessment.dataPoints} data points)`);
      console.log(`      ${assessment.description}`);
    });
    
    // Summary
    console.log('\n📊 SUMMARY:');
    const readyCharts = assessments.filter(a => a.ready).length;
    const totalCharts = assessments.length;
    console.log(`✅ Ready Charts: ${readyCharts}/${totalCharts}`);
    console.log(`📈 Total Data Points: ${predictions.length}`);
    console.log(`🌾 Available Crops: ${crops.length}`);
    console.log(`📍 Available Regions: ${regions.length}`);
    
    if (readyCharts === totalCharts) {
      console.log('\n🎉 SUCCESS: All visualizations are ready with real data!');
    } else {
      console.log('\n⚠️  WARNING: Some visualizations need more data');
      console.log('   Generate more predictions to populate all charts');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the development server is running on http://localhost:3001');
  }
}

// Run the test
testVisualizations();
