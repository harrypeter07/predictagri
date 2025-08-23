'use client'

import { useEffect, useState } from 'react'

export default function WeatherPanel({ lat, lon, title = '🌤️ Weather (Open‑Meteo)' }) {
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
      //   const res = await fetch(`/api/weather?lat=${finalLat}&lon=${finalLon}`)
      //   const json = await res.json()
      //   if (!res.ok || !json.success) throw new Error(json.error || 'Weather fetch failed')
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
        <h3 className="text-xl font-semibold text-white">{title}</h3>
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
              
              const res = await fetch(`/api/weather?lat=${finalLat}&lon=${finalLon}`)
              const json = await res.json()
              if (!res.ok || !json.success) throw new Error(json.error || 'Weather fetch failed')
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
          {loading ? 'Loading...' : 'Fetch Weather'}
        </button>
      </div>
      {loading && <p className="text-gray-300">Loading weather...</p>}
      {error && <p className="text-red-300">{error}</p>}
      {data && (
        <div className="space-y-3 text-gray-300 text-sm">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-gray-400">Temperature</p>
              <p className="text-white text-lg">{data.current?.temperature_2m}°C</p>
            </div>
            <div>
              <p className="text-gray-400">Humidity</p>
              <p className="text-white text-lg">{data.current?.relative_humidity_2m}%</p>
            </div>
            <div>
              <p className="text-gray-400">Wind</p>
              <p className="text-white text-lg">{data.current?.wind_speed_10m} km/h</p>
            </div>
          </div>
          <div>
            <p className="text-gray-400 mb-2">Next 3 days</p>
            <div className="grid grid-cols-3 gap-3">
              {data.daily?.time?.slice(0,3).map((t, i) => (
                <div key={t} className="bg-gray-800 rounded p-3 border border-gray-700">
                  <p className="text-xs text-gray-400">{new Date(t).toDateString()}</p>
                  <p className="text-sm">High {data.daily.temperature_2m_max[i]}°C</p>
                  <p className="text-sm">Low {data.daily.temperature_2m_min[i]}°C</p>
                  <p className="text-sm">Rain {data.daily.precipitation_sum[i]}mm</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
