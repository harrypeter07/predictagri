'use client'

import { useState, useEffect } from 'react'
import { generateMockPrediction, mockUsers } from '../../lib/mockData'

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState([])
  const [regions, setRegions] = useState([])
  const [crops, setCrops] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCrop, setSelectedCrop] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedUser, setSelectedUser] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [predictionsRes, regionsRes, cropsRes] = await Promise.all([
        fetch('/api/predictions'),
        fetch('/api/regions'),
        fetch('/api/crops')
      ])

      if (predictionsRes.ok) {
        const predictionsData = await predictionsRes.json()
        setPredictions(predictionsData)
      }

      if (regionsRes.ok) {
        const regionsData = await regionsRes.json()
        setRegions(regionsData)
      }

      if (cropsRes.ok) {
        const cropsData = await cropsRes.json()
        setCrops(cropsData)
      }
    } catch (err) {
      setError('Error fetching data')
    } finally {
      setLoading(false)
    }
  }

  const generatePrediction = async () => {
    if (!selectedCrop || !selectedRegion) {
      setError('Please select both crop and region')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const mockPrediction = generateMockPrediction(selectedCrop, selectedRegion)
      const requestData = {
        userId: selectedUser || null,
        cropId: selectedCrop,
        regionId: selectedRegion,
        features: mockPrediction.features
      }

      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        const newPrediction = await response.json()
        setPredictions([newPrediction, ...predictions])
        setSelectedCrop('')
        setSelectedRegion('')
        setSelectedUser('')
      } else {
        setError('Failed to generate prediction')
      }
    } catch (err) {
      setError('Error generating prediction')
    } finally {
      setLoading(false)
    }
  }

  const generateMultiplePredictions = async (count = 5) => {
    setLoading(true)
    setError(null)

    try {
      const promises = []
      for (let i = 0; i < count; i++) {
        const randomCrop = crops[Math.floor(Math.random() * crops.length)]
        const randomRegion = regions[Math.floor(Math.random() * regions.length)]
        const randomUser = mockUsers[Math.floor(Math.random() * mockUsers.length)]
        
        if (randomCrop && randomRegion) {
          const mockPrediction = generateMockPrediction(randomCrop.id, randomRegion.id)
          const requestData = {
            userId: randomUser.id,
            cropId: randomCrop.id,
            regionId: randomRegion.id,
            features: mockPrediction.features
          }

          promises.push(
            fetch('/api/predictions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestData)
            })
          )
        }
      }

      await Promise.all(promises)
      fetchData()
    } catch (err) {
      setError('Error generating multiple predictions')
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (riskScore) => {
    if (riskScore > 0.5) return 'text-red-600'
    if (riskScore > 0.3) return 'text-yellow-600'
    return 'text-green-600'
  }

  if (loading && predictions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading predictions...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Predictions Management</h1>
          <p className="text-lg text-gray-600">Generate and manage crop yield predictions</p>
        </header>

        {/* Prediction Generator */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Generate New Prediction</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="">Select Crop</option>
              {crops.map((crop) => (
                <option key={crop.id} value={crop.id}>
                  {crop.name} ({crop.season})
                </option>
              ))}
            </select>

            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="">Select Region</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>

            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="">Select User (Optional)</option>
              {mockUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-4">
            <button
              onClick={generatePrediction}
              disabled={loading || !selectedCrop || !selectedRegion}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg"
            >
              {loading ? 'Generating...' : 'Generate Prediction'}
            </button>
            <button
              onClick={() => generateMultiplePredictions(5)}
              disabled={loading || crops.length === 0 || regions.length === 0}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg"
            >
              Generate 5 Random Predictions
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Predictions List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Recent Predictions</h2>
            <span className="text-sm text-gray-500">
              Total: {predictions.length} predictions
            </span>
          </div>

          {predictions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No predictions found. Generate one to get started!</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {predictions.map((prediction) => (
                <div key={prediction.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">
                          {prediction.crops?.name || 'Unknown Crop'}
                        </h3>
                        <span className="text-sm text-gray-500">
                          in {prediction.regions?.name || 'Unknown Region'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Yield:</span>
                          <span className="text-green-600 ml-1">
                            {prediction.yield?.toFixed(2)} units
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Risk Score:</span>
                          <span className={`ml-1 ${getRiskColor(prediction.risk_score)}`}>
                            {(prediction.risk_score * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Created:</span>
                          <span className="text-gray-600 ml-1">
                            {new Date(prediction.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">User:</span>
                          <span className="text-gray-600 ml-1">
                            {prediction.user_id ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>

                      {prediction.features && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                            View Features
                          </summary>
                          <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(prediction.features, null, 2)}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-2xl font-bold text-blue-600">{predictions.length}</p>
            <p className="text-sm text-gray-600">Total Predictions</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-2xl font-bold text-green-600">
              {predictions.length > 0 ? (predictions.reduce((sum, p) => sum + p.yield, 0) / predictions.length).toFixed(1) : 0}
            </p>
            <p className="text-sm text-gray-600">Avg Yield</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-2xl font-bold text-red-600">
              {predictions.length > 0 ? (predictions.filter(p => p.risk_score > 0.5).length / predictions.length * 100).toFixed(1) : 0}%
            </p>
            <p className="text-sm text-gray-600">High Risk %</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {new Set(predictions.map(p => p.crops?.name).filter(Boolean)).size}
            </p>
            <p className="text-sm text-gray-600">Unique Crops</p>
          </div>
        </div>
      </div>
    </div>
  )
}
