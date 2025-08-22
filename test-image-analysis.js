// Test script for Image Analysis API
const fs = require('fs')
const path = require('path')

// Create a simple test image (1x1 pixel PNG)
const createTestImage = () => {
  // This is a minimal 1x1 pixel PNG file in base64
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  const buffer = Buffer.from(pngBase64, 'base64')
  
  const testImagePath = path.join(__dirname, 'test-image.png')
  fs.writeFileSync(testImagePath, buffer)
  console.log('✅ Test image created:', testImagePath)
  return testImagePath
}

// Test the API
const testAPI = async () => {
  try {
    // Test GET endpoint
    console.log('\n🔍 Testing GET /api/image-analysis...')
    const getResponse = await fetch('http://localhost:3000/api/image-analysis')
    const getData = await getResponse.json()
    
    if (getResponse.ok) {
      console.log('✅ GET endpoint working:', getData.success)
      console.log('📊 Supported formats:', getData.supportedFormats)
      console.log('🔬 Analysis types:', getData.analysisTypes.length)
    } else {
      console.log('❌ GET endpoint failed:', getResponse.status)
    }

    // Test POST endpoint with test image
    console.log('\n🔍 Testing POST /api/image-analysis...')
    const testImagePath = createTestImage()
    const imageBuffer = fs.readFileSync(testImagePath)
    
    const formData = new FormData()
    formData.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'test.png')
    formData.append('analysisType', 'comprehensive')
    
    const postResponse = await fetch('http://localhost:3000/api/image-analysis', {
      method: 'POST',
      body: formData
    })
    
    if (postResponse.ok) {
      const postData = await postResponse.json()
      console.log('✅ POST endpoint working:', postData.success)
      console.log('📊 Analysis type:', postData.data?.analysisType)
      console.log('🔬 Results available:', !!postData.data?.results)
    } else {
      const errorData = await postResponse.json()
      console.log('❌ POST endpoint failed:', postResponse.status, errorData.error)
    }

    // Clean up test image
    fs.unlinkSync(testImagePath)
    console.log('🧹 Test image cleaned up')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  console.log('🚀 Starting Image Analysis API Test...')
  testAPI()
}

module.exports = { testAPI, createTestImage }
