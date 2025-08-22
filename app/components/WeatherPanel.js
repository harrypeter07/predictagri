'use client'

import { useEffect, useState } from 'react'

export default function WeatherPanel({ lat = 38.5111, lon = -96.8005, title = '🌤️ Weather (Open‑Meteo)' }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    async function run() {
      try {
        setLoading(true)
        const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`)
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.error || 'Weather fetch failed')
        if (mounted) setData(json)
      } catch (e) {
        if (mounted) setError(e.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    run()
    return () => { mounted = false }
  }, [lat, lon])

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
      <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
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
