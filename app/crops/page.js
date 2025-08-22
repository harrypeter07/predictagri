'use client'

import { useState, useEffect } from 'react'
// Removed mock data import - using real crop management

export default function CropsPage() {
  const [crops, setCrops] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCrop, setNewCrop] = useState({ name: '', season: '' })

  useEffect(() => {
    fetchCrops()
  }, [])

  const fetchCrops = async () => {
    try {
      const response = await fetch('/api/crops')
      const data = await response.json()
      if (response.ok) {
        setCrops(data)
      } else {
        setError('Failed to fetch crops')
      }
    } catch (err) {
      setError('Error fetching crops')
    } finally {
      setLoading(false)
    }
  }

  const addCommonCrops = async () => {
    setLoading(true)
    try {
      const commonCrops = [
        { name: 'Wheat', season: 'Rabi' },
        { name: 'Rice', season: 'Kharif' },
        { name: 'Maize', season: 'Kharif' },
        { name: 'Cotton', season: 'Kharif' },
        { name: 'Sugarcane', season: 'Year-round' },
        { name: 'Potato', season: 'Rabi' },
        { name: 'Tomato', season: 'Year-round' },
        { name: 'Onion', season: 'Rabi' }
      ]
      
      for (const crop of commonCrops) {
        await fetch('/api/crops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(crop)
        })
      }
      fetchCrops()
    } catch (err) {
      setError('Error adding common crops')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCrop = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch('/api/crops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCrop)
      })
      
      if (response.ok) {
        setNewCrop({ name: '', season: '' })
        setShowAddForm(false)
        fetchCrops()
      } else {
        setError('Failed to add crop')
      }
    } catch (err) {
      setError('Error adding crop')
    } finally {
      setLoading(false)
    }
  }

  const getSeasonColor = (season) => {
    switch (season) {
      case 'Rabi': return 'bg-blue-100 text-blue-800'
      case 'Kharif': return 'bg-green-100 text-green-800'
      case 'Year-round': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-xl text-white">Loading crops...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Crops Management</h1>
          <p className="text-lg text-gray-300">Manage agricultural crops and seasons</p>
        </header>

        <div className="mb-6 flex gap-4 justify-center">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            {showAddForm ? 'Cancel' : 'Add New Crop'}
          </button>
          <button
            onClick={addCommonCrops}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg"
          >
            Add Common Crops
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900 border border-red-700 text-red-200 rounded">
            {error}
          </div>
        )}

        {showAddForm && (
          <div className="mb-6 bg-gray-900 rounded-lg shadow-md p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-white">Add New Crop</h2>
            <form onSubmit={handleAddCrop} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Crop Name"
                value={newCrop.name}
                onChange={(e) => setNewCrop({...newCrop, name: e.target.value})}
                className="border border-gray-600 rounded px-3 py-2 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <select
                value={newCrop.season}
                onChange={(e) => setNewCrop({...newCrop, season: e.target.value})}
                className="border border-gray-600 rounded px-3 py-2 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Season</option>
                <option value="Rabi">Rabi (Winter)</option>
                <option value="Kharif">Kharif (Monsoon)</option>
                <option value="Year-round">Year-round</option>
              </select>
              <button
                type="submit"
                disabled={loading}
                className="md:col-span-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg"
              >
                {loading ? 'Adding...' : 'Add Crop'}
              </button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {crops.map((crop) => (
            <div key={crop.id} className="bg-gray-900 rounded-lg shadow-md p-6 border border-gray-700">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-white">{crop.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeasonColor(crop.season)}`}>
                  {crop.season}
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-300">
                <p><strong>Season:</strong> {crop.season}</p>
                <p><strong>ID:</strong> {crop.id}</p>
              </div>
            </div>
          ))}
        </div>

        {crops.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No crops found. Add some crops to get started!</p>
          </div>
        )}

        {/* Season Legend */}
        <div className="mt-8 bg-gray-900 rounded-lg shadow-md p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-white">Season Legend</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-blue-100 rounded"></span>
              <span className="text-blue-800 font-medium">Rabi (Winter)</span>
              <span className="text-sm text-gray-600">- Oct to March</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-green-100 rounded"></span>
              <span className="text-green-800 font-medium">Kharif (Monsoon)</span>
              <span className="text-sm text-gray-600">- June to Oct</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-purple-100 rounded"></span>
              <span className="text-purple-800 font-medium">Year-round</span>
              <span className="text-sm text-gray-600">- All seasons</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
