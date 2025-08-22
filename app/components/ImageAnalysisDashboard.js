'use client'

import { useState, useRef } from 'react'

export const ImageAnalysisDashboard = ({ regions, crops }) => {
  const [selectedImage, setSelectedImage] = useState(null)
  const [analysisType, setAnalysisType] = useState('comprehensive')
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedCrop, setSelectedCrop] = useState('')
  const [analysisResult, setAnalysisResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  const handleImageUpload = (file) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file)
      setError(null)
      setAnalysisResult(null)
    } else {
      setError('Please select a valid image file')
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0])
    }
  }

  const analyzeImage = async () => {
    if (!selectedImage) {
      setError('Please select an image first')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', selectedImage)
      formData.append('analysisType', analysisType)
      if (selectedRegion) formData.append('regionId', selectedRegion)
      if (selectedCrop) formData.append('cropId', selectedCrop)

      const response = await fetch('/api/image-analysis', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Analysis failed')
      }

      const result = await response.json()
      setAnalysisResult(result.data)
    } catch (err) {
      setError(err.message)
      console.error('Image analysis error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score) => {
    if (score > 0.8) return 'text-green-400'
    if (score > 0.6) return 'text-yellow-400'
    if (score > 0.4) return 'text-orange-400'
    return 'text-red-400'
  }

  const getScoreIcon = (score) => {
    if (score > 0.8) return '🟢'
    if (score > 0.6) return '🟡'
    if (score > 0.4) return '🟠'
    return '🔴'
  }

  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case 'low': return 'text-green-400'
      case 'medium': return 'text-yellow-400'
      case 'high': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
      <h3 className="text-xl font-semibold text-white mb-6">🔍 Image Analysis Dashboard</h3>
      
      {/* Image Upload Section */}
      <div className="mb-6">
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive ? 'border-blue-400 bg-blue-900' : 'border-gray-600'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {selectedImage ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <img
                  src={URL.createObjectURL(selectedImage)}
                  alt="Selected"
                  className="max-h-48 rounded-lg border border-gray-600"
                />
              </div>
              <div className="text-sm text-gray-300">
                <p>File: {selectedImage.name}</p>
                <p>Size: {(selectedImage.size / 1024 / 1024).toFixed(2)} MB</p>
                <p>Type: {selectedImage.type}</p>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                Remove Image
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-6xl">📷</div>
              <div>
                <p className="text-lg text-white mb-2">Drop your agricultural image here</p>
                <p className="text-sm text-gray-400 mb-4">
                  or click to browse (JPEG, PNG, BMP, TIFF up to 10MB)
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                >
                  Choose Image
                </button>
              </div>
            </div>
          )}
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Analysis Configuration */}
      {selectedImage && (
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Analysis Type
              </label>
              <select
                value={analysisType}
                onChange={(e) => setAnalysisType(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="comprehensive">Comprehensive Analysis</option>
                <option value="crop-health">Crop Health</option>
                <option value="disease-detection">Disease Detection</option>
                <option value="soil-analysis">Soil Analysis</option>
                <option value="weed-detection">Weed Detection</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Region (Optional)
              </label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Region</option>
                {regions?.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Crop (Optional)
              </label>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Crop</option>
                {crops?.map((crop) => (
                  <option key={crop.id} value={crop.id}>
                    {crop.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <button
            onClick={analyzeImage}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
          >
            {loading ? '🔬 Analyzing Image...' : '🚀 Start Analysis'}
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-900 border border-red-700 text-red-200 rounded-lg">
          <p className="font-medium">Analysis Error:</p>
          <p>{error}</p>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="space-y-6">
          <div className="border-b border-gray-700 pb-4">
            <h4 className="text-lg font-semibold text-white mb-2">📊 Analysis Results</h4>
            <div className="text-sm text-gray-400">
              <p>Analysis Type: {analysisResult.analysisType}</p>
              <p>Timestamp: {new Date(analysisResult.timestamp).toLocaleString()}</p>
            </div>
          </div>

          {/* Comprehensive Analysis Results */}
          {analysisResult.analysisType === 'comprehensive' && analysisResult.results.overallScore && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Overall Score */}
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                <h5 className="text-lg font-semibold text-white mb-3">🎯 Overall Health Score</h5>
                <div className="text-center">
                  <div className={`text-4xl font-bold mb-2 ${getScoreColor(analysisResult.results.overallScore)}`}>
                    {getScoreIcon(analysisResult.results.overallScore)}
                    {(analysisResult.results.overallScore * 100).toFixed(1)}%
                  </div>
                  <p className="text-gray-300">Agricultural Health Index</p>
                </div>
              </div>

              {/* Risk Assessment */}
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                <h5 className="text-lg font-semibold text-white mb-3">⚠️ Risk Assessment</h5>
                <div className="text-center">
                  <div className={`text-2xl font-bold mb-2 ${getSeverityColor(analysisResult.results.riskAssessment)}`}>
                    {analysisResult.results.riskAssessment.toUpperCase()}
                  </div>
                  <p className="text-gray-300">Current Risk Level</p>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Results by Analysis Type */}
          <div className="space-y-4">
            {analysisResult.analysisType === 'crop-health' && analysisResult.results.healthScore && (
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                <h5 className="text-lg font-semibold text-white mb-3">🌱 Crop Health Analysis</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold mb-1 ${getScoreColor(analysisResult.results.healthScore)}`}>
                      {(analysisResult.results.healthScore * 100).toFixed(1)}%
                    </div>
                    <p className="text-sm text-gray-400">Health Score</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold mb-1 text-green-400">
                      {analysisResult.results.vegetationAnalysis?.percentage?.toFixed(1)}%
                    </div>
                    <p className="text-sm text-gray-400">Vegetation</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold mb-1 text-blue-400">
                      {analysisResult.results.confidence}
                    </div>
                    <p className="text-sm text-gray-400">Confidence</p>
                  </div>
                </div>
              </div>
            )}

            {analysisResult.analysisType === 'disease-detection' && analysisResult.results.diseaseProbability && (
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                <h5 className="text-lg font-semibold text-white mb-3">🦠 Disease Detection</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold mb-1 ${getScoreColor(1 - analysisResult.results.diseaseProbability)}`}>
                      {((1 - analysisResult.results.diseaseProbability) * 100).toFixed(1)}%
                    </div>
                    <p className="text-sm text-gray-400">Health Probability</p>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold mb-1 ${getSeverityColor(analysisResult.results.severity)}`}>
                      {analysisResult.results.severity}
                    </div>
                    <p className="text-sm text-gray-400">Disease Severity</p>
                  </div>
                </div>
              </div>
            )}

            {analysisResult.analysisType === 'soil-analysis' && analysisResult.results.soilQuality && (
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                <h5 className="text-lg font-semibold text-white mb-3">🌍 Soil Analysis</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold mb-1 ${getScoreColor(analysisResult.results.soilQuality)}`}>
                      {(analysisResult.results.soilQuality * 100).toFixed(1)}%
                    </div>
                    <p className="text-sm text-gray-400">Soil Quality</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold mb-1 text-blue-400">
                      {analysisResult.results.moistureLevel?.toFixed(1)}%
                    </div>
                    <p className="text-sm text-gray-400">Moisture</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold mb-1 text-yellow-400">
                      {analysisResult.results.fertility}
                    </div>
                    <p className="text-sm text-gray-400">Fertility</p>
                  </div>
                </div>
              </div>
            )}

            {analysisResult.analysisType === 'weed-detection' && analysisResult.results.weedCoverage && (
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                <h5 className="text-lg font-semibold text-white mb-3">🌿 Weed Detection</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold mb-1 ${getScoreColor(1 - analysisResult.results.weedCoverage / 100)}`}>
                      {analysisResult.results.weedCoverage.toFixed(1)}%
                    </div>
                    <p className="text-sm text-gray-400">Weed Coverage</p>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold mb-1 ${getSeverityColor(analysisResult.results.severity)}`}>
                      {analysisResult.results.severity}
                    </div>
                    <p className="text-sm text-gray-400">Severity</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {analysisResult.results.recommendations && (
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                <h5 className="text-lg font-semibold text-white mb-3">💡 Recommendations</h5>
                <ul className="space-y-2">
                  {analysisResult.results.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <span className="text-gray-300">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Priority Actions for Comprehensive Analysis */}
            {analysisResult.results.priorityActions && (
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                <h5 className="text-lg font-semibold text-white mb-3">🚨 Priority Actions</h5>
                <ul className="space-y-2">
                  {analysisResult.results.priorityActions.map((action, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-red-400 mt-1">⚠</span>
                      <span className="text-gray-300">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageAnalysisDashboard
