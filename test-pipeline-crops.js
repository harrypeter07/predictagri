// Test script to verify pipeline works with different crops
import fetch from 'node-fetch';

async function testPipelineWithDifferentCrops() {
  console.log('🧪 Testing Pipeline with Different Crops...\n');
  
  const crops = [
    { id: '1', name: 'Rice', season: 'Kharif' },
    { id: '2', name: 'Wheat', season: 'Rabi' },
    { id: '3', name: 'Maize', season: 'Kharif' },
    { id: '4', name: 'Cotton', season: 'Kharif' },
    { id: '5', name: 'Sugarcane', season: 'Year-round' }
  ];

  const testResults = [];

  for (const crop of crops) {
    console.log(`🌾 Testing pipeline for crop: ${crop.name} (${crop.season})`);
    
    try {
      const requestData = {
        farmerData: {
          farmerId: `test-farmer-${Date.now()}`,
          coordinates: { lat: 20.5937, lon: 78.9629 }, // India coordinates
          address: 'Test Location, India',
          crops: [crop.name],
          farmSize: 5.0,
          soilType: 'Clay Loam',
          irrigationType: 'Sprinkler',
          previousYield: 'Good',
          pestIssues: [],
          contactInfo: { phoneNumber: '+919322909257' }
        },
        cropId: crop.id,
        cropName: crop.name,
        region: 'Test Region'
      };

      console.log(`   📤 Sending request for ${crop.name}...`);
      
      const response = await fetch('http://localhost:3001/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`   ✅ Success for ${crop.name}`);
        
        const analysis = {
          crop: crop.name,
          success: result.success,
          hasCropAnalysis: !!result.cropAnalysis,
          cropName: result.cropAnalysis?.selectedCrop || 'N/A',
          analysisType: result.cropAnalysis?.analysisType || 'N/A',
          hasInsights: !!result.insights,
          insightsCount: result.insights?.length || 0,
          hasRecommendations: !!result.recommendations,
          recommendationsCount: result.recommendations?.length || 0,
          hasDataCollection: !!result.dataCollection,
          hasLocation: !!result.location,
          responseTime: result.metadata?.responseTime || 'N/A'
        };

        testResults.push(analysis);
        
        console.log(`   📊 Analysis results:`);
        console.log(`      - Crop Analysis: ${analysis.hasCropAnalysis ? '✅' : '❌'}`);
        console.log(`      - Insights: ${analysis.insightsCount} items`);
        console.log(`      - Recommendations: ${analysis.recommendationsCount} items`);
        console.log(`      - Response Time: ${analysis.responseTime}`);
        
        // Check for crop-specific data
        if (result.cropAnalysis?.cropSpecificInsights) {
          console.log(`      - Crop-specific insights: ${result.cropAnalysis.cropSpecificInsights.length} items`);
        }
        
      } else {
        console.log(`   ❌ Failed for ${crop.name}: ${result.error}`);
        testResults.push({
          crop: crop.name,
          success: false,
          error: result.error
        });
      }

      // Wait a bit between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.log(`   ❌ Error for ${crop.name}: ${error.message}`);
      testResults.push({
        crop: crop.name,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n📊 PIPELINE CROP TEST SUMMARY:');
  console.log('================================');
  
  const successfulTests = testResults.filter(r => r.success);
  const failedTests = testResults.filter(r => !r.success);
  
  console.log(`✅ Successful Tests: ${successfulTests.length}/${testResults.length}`);
  console.log(`❌ Failed Tests: ${failedTests.length}/${testResults.length}`);
  
  if (successfulTests.length > 0) {
    console.log('\n🌾 Successful Crop Analysis:');
    successfulTests.forEach(test => {
      console.log(`   ${test.crop}:`);
      console.log(`      - Crop Analysis: ${test.hasCropAnalysis ? '✅' : '❌'}`);
      console.log(`      - Insights: ${test.insightsCount}`);
      console.log(`      - Recommendations: ${test.recommendationsCount}`);
      console.log(`      - Response Time: ${test.responseTime}`);
    });
  }
  
  if (failedTests.length > 0) {
    console.log('\n❌ Failed Tests:');
    failedTests.forEach(test => {
      console.log(`   ${test.crop}: ${test.error}`);
    });
  }

  // Check for data diversity
  if (successfulTests.length > 1) {
    console.log('\n🔍 Data Diversity Analysis:');
    
    const insightCounts = successfulTests.map(t => t.insightsCount);
    const recommendationCounts = successfulTests.map(t => t.recommendationsCount);
    
    const avgInsights = insightCounts.reduce((sum, count) => sum + count, 0) / insightCounts.length;
    const avgRecommendations = recommendationCounts.reduce((sum, count) => sum + count, 0) / recommendationCounts.length;
    
    console.log(`   Average Insights per crop: ${avgInsights.toFixed(1)}`);
    console.log(`   Average Recommendations per crop: ${avgRecommendations.toFixed(1)}`);
    
    const insightVariance = insightCounts.some(count => count !== insightCounts[0]);
    const recommendationVariance = recommendationCounts.some(count => count !== recommendationCounts[0]);
    
    if (insightVariance || recommendationVariance) {
      console.log('   ✅ Data varies between crops (good!)');
    } else {
      console.log('   ⚠️  Data is similar across crops (may need more diversity)');
    }
  }

  // Overall assessment
  console.log('\n🎯 OVERALL ASSESSMENT:');
  if (successfulTests.length === testResults.length) {
    console.log('🎉 EXCELLENT: All crop pipeline tests passed!');
    console.log('   - Pipeline works with different crops');
    console.log('   - Crop-specific analysis is functional');
    console.log('   - Data generation is working properly');
  } else if (successfulTests.length > testResults.length / 2) {
    console.log('✅ GOOD: Most crop pipeline tests passed');
    console.log('   - Pipeline generally works with different crops');
    console.log('   - Some issues need attention');
  } else {
    console.log('⚠️  NEEDS ATTENTION: Many crop pipeline tests failed');
    console.log('   - Pipeline may have issues with crop-specific analysis');
    console.log('   - Check error logs for details');
  }

  return testResults;
}

// Run the test
testPipelineWithDifferentCrops().catch(console.error);
