'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'

const SatelliteDataDashboard = ({ region, farmerData }) => {
  const [satelliteData, setSatelliteData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedImageType, setSelectedImageType] = useState('all')

  useEffect(() => {
    if (region || farmerData) {
      fetchSatelliteData()
    }
  }, [region, farmerData])

  const fetchSatelliteData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const coordinates = farmerData?.coordinates || region
      const response = await fetch('/api/pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          farmerData: {
            farmerId: farmerData?.farmerId || 'region_analysis',
            coordinates: coordinates
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch satellite data')
      }

      const data = await response.json()
      setSatelliteData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getImageTypes = () => {
    if (!satelliteData?.dataCollection?.environmental) return []
    
    const types = []
    if (satelliteData.dataCollection.environmental.ndvi?.satelliteImage) {
      types.push('ndvi')
    }
    if (satelliteData.dataCollection.environmental.rgbImage?.imageUrl) {
      types.push('rgb')
    }
    if (satelliteData.dataCollection.environmental.landSurfaceTemperature?.satelliteImage) {
      types.push('temperature')
    }
    return types
  }

  const renderSatelliteImage = (imageData, type) => {
    if (!imageData?.imageUrl && !imageData?.satelliteImage) {
      return (
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <p className="text-gray-500">No satellite image available for {type}</p>
        </div>
      )
    }

    const imageUrl = imageData.imageUrl || imageData.satelliteImage
    const imageType = imageData.imageType || type.toUpperCase()
    const coordinates = imageData.coordinates || region || farmerData?.coordinates

    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-blue-600 to-green-600 text-white">
          <h3 className="text-lg font-semibold">{imageType} Satellite Image</h3>
          <p className="text-sm opacity-90">
            {coordinates?.lat?.toFixed(4)}, {coordinates?.lon?.toFixed(4)}
          </p>
        </div>
        
        <div className="relative">
          <Image
            src={imageUrl}
            alt={`${imageType} satellite image`}
            width={512}
            height={512}
            className="w-full h-auto"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/512x512/4CAF50/FFFFFF?text=Image+Loading+Failed'
            }}
          />
          
          {/* Image overlay with metadata */}
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-3">
            <div className="flex justify-between items-center text-sm">
              <span>Source: {imageData.source || 'Google Earth Engine'}</span>
              <span>Quality: {imageData.quality || 'Unknown'}</span>
            </div>
            {imageData.metadata && (
              <div className="text-xs mt-1 opacity-90">
                {imageData.metadata.satellite && (
                  <span className="mr-3">Satellite: {imageData.metadata.satellite}</span>
                )}
                {imageData.metadata.resolution && (
                  <span className="mr-3">Resolution: {imageData.metadata.resolution}</span>
                )}
                {imageData.metadata.cloudCover && imageData.metadata.cloudCover !== 'Unknown' && (
                  <span>Cloud Cover: {imageData.metadata.cloudCover}%</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Image controls */}
        <div className="p-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <span>Timestamp: {new Date(imageData.timestamp).toLocaleString()}</span>
            </div>
            <button
              onClick={() => window.open(imageUrl, '_blank')}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              View Full Size
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderNDVICard = () => {
    if (!satelliteData?.dataCollection?.environmental?.ndvi) return null
    
    const ndviData = satelliteData.dataCollection.environmental.ndvi
    const ndviValue = ndviData.ndvi
    const interpretation = ndviData.interpretation
    
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Vegetation Index (NDVI)</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            ndviValue > 0.6 ? 'bg-green-100 text-green-800' :
            ndviValue > 0.4 ? 'bg-yellow-100 text-yellow-800' :
            ndviValue > 0.2 ? 'bg-orange-100 text-orange-800' :
            'bg-red-100 text-red-800'
          }`}>
            {ndviValue.toFixed(3)}
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Interpretation:</span>
            <span className="font-medium">{interpretation}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Source:</span>
            <span className="font-medium">{ndviData.source}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Quality:</span>
            <span className="font-medium">{ndviData.quality}</span>
          </div>
        </div>

        {/* NDVI Scale Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Low (0.0)</span>
            <span>High (1.0)</span>
          </div>
          <div className="w-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-3 rounded-full">
            <div 
              className="bg-white w-2 h-3 rounded-full border-2 border-gray-800 relative"
              style={{ left: `${ndviValue * 100}%`, transform: 'translateX(-50%)' }}
            >
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                {ndviValue.toFixed(3)}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderImageGallery = () => {
    const imageTypes = getImageTypes()
    if (imageTypes.length === 0) return null

    const filteredTypes = selectedImageType === 'all' ? imageTypes : [selectedImageType]
    
    return (
      <div className="space-y-6">
        {/* Image Type Selector */}
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedImageType('all')}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedImageType === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Images
          </button>
          {imageTypes.map(type => (
            <button
              key={type}
              onClick={() => setSelectedImageType(type)}
              className={`px-4 py-2 rounded-lg font-medium capitalize ${
                selectedImageType === type 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Image Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTypes.map(type => {
            let imageData
            switch (type) {
              case 'ndvi':
                imageData = satelliteData?.dataCollection?.environmental?.ndvi
                break
              case 'rgb':
                imageData = satelliteData?.dataCollection?.environmental?.rgbImage
                break
              case 'temperature':
                imageData = satelliteData?.dataCollection?.environmental?.landSurfaceTemperature
                break
              default:
                return null
            }
            
            return (
              <div key={type}>
                {renderSatelliteImage(imageData, type)}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Fetching satellite data from Google Earth Engine...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 mb-2">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Satellite Data</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchSatelliteData}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!satelliteData) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-600 mb-2">No Satellite Data Available</h3>
        <p className="text-gray-500">Select a region or provide farmer data to view satellite imagery</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">🌍 Satellite Data Dashboard</h2>
        <p className="opacity-90">
          Real-time satellite imagery and vegetation analysis from Google Earth Engine
        </p>
      </div>

      {/* NDVI Card */}
      {renderNDVICard()}

      {/* Satellite Image Gallery */}
      {renderImageGallery()}

      {/* Data Summary */}
      {satelliteData?.dataCollection?.environmental && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Data Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {satelliteData.dataCollection.environmental.dataTypes?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Data Types</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {satelliteData.dataCollection.environmental.quality || 'Unknown'}
              </div>
              <div className="text-sm text-gray-600">Data Quality</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {new Date(satelliteData.dataCollection.environmental.timestamp).toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-600">Last Updated</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SatelliteDataDashboard
