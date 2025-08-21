'use client'

import { useState, useEffect } from 'react'
import { mockRegions } from '../../lib/mockData'

export default function RegionsPage() {
  const [regions, setRegions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newRegion, setNewRegion] = useState({
    name: '',
    lat: '',
    lon: '',
    soil_n: '',
    soil_p: '',
    soil_k: '',
    ph: ''
  })

  useEffect(() => {
    fetchRegions()
  }, [])

  const fetchRegions = async () => {
    try {
      const response = await fetch('/api/regions')
      const data = await response.json()
      if (response.ok) {
        setRegions(data)
      } else {
        setError('Failed to fetch regions')
      }
    } catch (err) {
      setError('Error fetching regions')
    } finally {
      setLoading(false)
    }
  }

  const addMockRegions = async () => {
    setLoading(true)
    try {
      for (const region of mockRegions) {
        await fetch('/api/regions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(region)
        })
      }
      fetchRegions()
    } catch (err) {
      setError('Error adding mock regions')
    } finally {
      setLoading(false)
    }
  }

  const handleAddRegion = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch('/api/regions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRegion)
      })
      
      if (response.ok) {
        setNewRegion({ name: '', lat: '', lon: '', soil_n: '', soil_p: '', soil_k: '', ph: '' })
        setShowAddForm(false)
        fetchRegions()
      } else {
        setError('Failed to add region')
      }
    } catch (err) {
      setError('Error adding region')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading regions...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Regions Management</h1>
          <p className="text-lg text-gray-600">Manage agricultural regions and soil data</p>
        </header>

        <div className="mb-6 flex gap-4 justify-center">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            {showAddForm ? 'Cancel' : 'Add New Region'}
          </button>
          <button
            onClick={addMockRegions}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg"
          >
            Add Mock Regions
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {showAddForm && (
          <div className="mb-6 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Add New Region</h2>
            <form onSubmit={handleAddRegion} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Region Name"
                value={newRegion.name}
                onChange={(e) => setNewRegion({...newRegion, name: e.target.value})}
                className="border rounded px-3 py-2"
                required
              />
              <input
                type="number"
                step="0.0001"
                placeholder="Latitude"
                value={newRegion.lat}
                onChange={(e) => setNewRegion({...newRegion, lat: e.target.value})}
                className="border rounded px-3 py-2"
                required
              />
              <input
                type="number"
                step="0.0001"
                placeholder="Longitude"
                value={newRegion.lon}
                onChange={(e) => setNewRegion({...newRegion, lon: e.target.value})}
                className="border rounded px-3 py-2"
                required
              />
              <input
                type="number"
                placeholder="Soil Nitrogen (N)"
                value={newRegion.soil_n}
                onChange={(e) => setNewRegion({...newRegion, soil_n: e.target.value})}
                className="border rounded px-3 py-2"
                required
              />
              <input
                type="number"
                placeholder="Soil Phosphorus (P)"
                value={newRegion.soil_p}
                onChange={(e) => setNewRegion({...newRegion, soil_p: e.target.value})}
                className="border rounded px-3 py-2"
                required
              />
              <input
                type="number"
                placeholder="Soil Potassium (K)"
                value={newRegion.soil_k}
                onChange={(e) => setNewRegion({...newRegion, soil_k: e.target.value})}
                className="border rounded px-3 py-2"
                required
              />
              <input
                type="number"
                step="0.1"
                placeholder="Soil pH"
                value={newRegion.ph}
                onChange={(e) => setNewRegion({...newRegion, ph: e.target.value})}
                className="border rounded px-3 py-2"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="md:col-span-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg"
              >
                {loading ? 'Adding...' : 'Add Region'}
              </button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {regions.map((region) => (
            <div key={region.id} className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-2">{region.name}</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Location:</strong> {region.lat.toFixed(4)}, {region.lon.toFixed(4)}</p>
                <p><strong>Soil N:</strong> {region.soil_n} mg/kg</p>
                <p><strong>Soil P:</strong> {region.soil_p} mg/kg</p>
                <p><strong>Soil K:</strong> {region.soil_k} mg/kg</p>
                <p><strong>pH:</strong> {region.ph}</p>
                <p className="text-xs text-gray-500">
                  Added: {new Date(region.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        {regions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No regions found. Add some regions to get started!</p>
          </div>
        )}
      </div>
    </div>
  )
}
