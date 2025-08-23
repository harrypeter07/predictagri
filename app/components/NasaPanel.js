'use client'

import { useEffect, useState } from 'react'

export default function NasaPanel({ lat, lon }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    async function run() {
      // Only fetch data when explicitly requested, not automatically
      // try {
      //   setLoading(true)
      //   
      //   let finalLat = lat
      //   let finalLon = lon
      //   
      //   // If no coordinates provided, get user's location
      //   if (!lat || !lon) {
      //     try {
      //       const { locationService } = await import('../../lib/locationService')
      //       const userLocation = await locationService.getLocationWithFallback()
      //       finalLat = userLocation.lat
      //       finalLon = userLocation.lon
      //     } catch (locationError) {
      //       console.warn('Failed to get user location, using default:', locationError)
      //       // Fallback to Nagpur, India
      //       finalLat = 21.1458
      //       finalLon = 79.0882
      //     }
      //   }
      //   
      //   const res = await fetch(`/api/agri/nasa?lat=${finalLat}&lon=${finalLon}`)
      //   const json = await res.json()
      //   if (!res.ok || !json.success) throw new Error(json.error || 'NASA fetch failed')
      //   if (mounted) setData({
      //     ...json,
      //     location: {
      //       lat: finalLat,
      //       lon: finalLon,
      //       source: (!lat || !lon) ? 'auto-detected' : 'provided'
      //     }
      //   })
      // } catch (e) {
      //   if (mounted) setError(e.message)
      // } finally {
      //   if (mounted) setLoading(false)
      // }
    }
    run()
    return () => { mounted = false }
  }, [lat, lon])

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">🌱 NASA Agricultural Data</h3>
        <button
          onClick={async () => {
            try {
              setLoading(true)
              setError(null)
              
              let finalLat = lat
              let finalLon = lon
              
              // If no coordinates provided, get user's location
              if (!lat || !lon) {
                try {
                  const { locationService } = await import('../../lib/locationService')
                  const userLocation = await locationService.getLocationWithFallback()
                  finalLat = userLocation.lat
                  finalLon = userLocation.lon
                } catch (locationError) {
                  console.warn('Failed to get user location, using default:', locationError)
                  // Fallback to Nagpur, India
                  finalLat = 21.1458
                  finalLon = 79.0882
                }
              }
              
              const res = await fetch(`/api/agri/nasa?lat=${finalLat}&lon=${finalLon}`)
              const json = await res.json()
              if (!res.ok || !json.success) throw new Error(json.error || 'NASA fetch failed')
              setData({
                ...json,
                location: {
                  lat: finalLat,
                  lon: finalLon,
                  source: (!lat || !lon) ? 'auto-detected' : 'provided'
                }
              })
            } catch (e) {
              setError(e.message)
            } finally {
              setLoading(false)
            }
          }}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm"
        >
          {loading ? 'Loading...' : 'Fetch NASA Data'}
        </button>
      </div>
      {loading && <p className="text-gray-300">Loading NASA data...</p>}
      {error && <p className="text-red-300">{error}</p>}
      {data && (
        <div className="space-y-3 text-gray-300 text-sm">
          <div>
            <p className="text-gray-400">APOD</p>
            <p className="text-white">{data.apod?.data?.title || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-400">Disasters</p>
            <ul className="list-disc ml-5">
              {(data.disasters?.data || []).slice(0,3).map((e) => (
                <li key={e.id}>{e.title}</li>
              ))}
            </ul>
          </div>
          {data.imagery && (
            <p className="text-gray-400">Imagery Source: {data.imagery?.source}</p>
          )}
        </div>
      )}
    </div>
  )
}
